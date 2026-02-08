/**
 * Audit Action Plan Service — Deviation detection & action plan generation.
 *
 * Extracted from routes/audits.js to improve maintainability.
 */

const logger = require('./logger');
const {
  computeAverageMinutes,
  isAcknowledgementCategory: _isAcknowledgementCategory,
} = require('./auditHelpers');

// -----------------------------------------------------------------------
// Severity configuration
// -----------------------------------------------------------------------

const SEVERITY_CONFIG = {
  CRITICAL: { level: 3, label: 'CRITICAL', priority: 'high' },
  MAJOR:    { level: 2, label: 'MAJOR',    priority: 'medium' },
  MINOR:    { level: 1, label: 'MINOR',    priority: 'low' },
};

const MAJOR_SEVERITY_CATEGORIES = ['QUALITY', 'SERVICE', 'HYGIENE', 'SPEED OF SERVICE'];
const BUSINESS_PRIORITY_ORDER   = ['QUALITY', 'SERVICE', 'HYGIENE', 'SPEED OF SERVICE'];

// -----------------------------------------------------------------------
// Category / priority helpers
// -----------------------------------------------------------------------

const normalizeCategoryForPriority = (value) => {
  if (!value) return '';
  const normalized = String(value).trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized.includes('speed of service')) return 'SPEED OF SERVICE';
  if (normalized.includes('quality'))          return 'QUALITY';
  if (normalized.includes('service'))          return 'SERVICE';
  if (normalized.includes('hygiene') || normalized.includes('cleanliness')) return 'HYGIENE';
  if (normalized.includes('acknowledg'))       return 'ACKNOWLEDGEMENT';
  return normalized.toUpperCase();
};

const getBusinessPriorityWeight = (category) => {
  const normalized = normalizeCategoryForPriority(category);
  const index = BUSINESS_PRIORITY_ORDER.findIndex(name => normalized.includes(name));
  return index === -1 ? 0 : (BUSINESS_PRIORITY_ORDER.length - index);
};

const isAcknowledgementCategory = (category) => {
  const normalized = normalizeCategoryForPriority(category);
  return normalized.includes('ACKNOWLEDG');
};

const determineOwnerRole = (category) => {
  const normalized = normalizeCategoryForPriority(category);
  if (normalized.includes('SERVICE') || normalized.includes('SPEED OF SERVICE')) return 'FOH';
  if (normalized.includes('QUALITY') || normalized.includes('HYGIENE') || normalized.includes('CLEANLINESS')) return 'Chef';
  if (normalized.includes('PROCESS') || normalized.includes('ACKNOWLEDG')) return 'Store Manager';
  return 'Store Manager';
};

const getTargetDaysForSeverity = (severityLabel) => {
  const criticalDays = Number(process.env.ACTION_PLAN_SLA_DAYS_CRITICAL || 3);
  const majorDays    = Number(process.env.ACTION_PLAN_SLA_DAYS_MAJOR    || 7);
  const minorDays    = Number(process.env.ACTION_PLAN_SLA_DAYS_MINOR    || 14);
  if (severityLabel === 'CRITICAL') return Number.isFinite(criticalDays) ? criticalDays : 3;
  if (severityLabel === 'MAJOR')    return Number.isFinite(majorDays)    ? majorDays    : 7;
  return Number.isFinite(minorDays) ? minorDays : 14;
};

const computeScoreLoss = (numericMark, maxMark, isMissingAnswer, avgMinutes, targetMinutes) => {
  if (Number.isFinite(numericMark)) return Math.max(0, (Number(maxMark) || 0) - numericMark);
  if (isMissingAnswer)              return Number(maxMark) || 0;
  if (Number.isFinite(avgMinutes) && Number.isFinite(targetMinutes)) return Math.max(0, avgMinutes - targetMinutes);
  return 0;
};

// -----------------------------------------------------------------------
// Severity determination
// -----------------------------------------------------------------------

function determineSeverity(isCritical, category) {
  if (isCritical) return SEVERITY_CONFIG.CRITICAL;
  const upperCategory = (category || '').toUpperCase();
  for (const majorCat of MAJOR_SEVERITY_CATEGORIES) {
    if (upperCategory.includes(majorCat)) return SEVERITY_CONFIG.MAJOR;
  }
  return SEVERITY_CONFIG.MINOR;
}

// -----------------------------------------------------------------------
// Deviation reason
// -----------------------------------------------------------------------

function getDeviationReason(item, selectedMark, isCritical, isRequired, maxMark, speedOfServiceBreach, acknowledgementMissing, selectedOptionText) {
  const reasons = [];
  const parsedMark = parseFloat(selectedMark);
  const numericMark = Number.isFinite(parsedMark) ? parsedMark : null;

  if (selectedMark === '0' || numericMark === 0) reasons.push('Selected option score = 0');
  const normalizedOption = String(selectedOptionText || '').trim().toLowerCase();
  if (normalizedOption === 'no') reasons.push('Answer marked as No');
  if (isCritical && numericMark !== null && numericMark < maxMark) reasons.push('Critical item with score below maximum');
  if (isRequired && (!item.selected_option_id && !item.mark && !item.comment && !item.photo_url)) reasons.push('Required item with missing answer');
  if (acknowledgementMissing) reasons.push('Acknowledgement missing');
  if (speedOfServiceBreach)   reasons.push('Speed of Service Avg exceeds SLA');

  return reasons.length > 0 ? reasons.join('; ') : 'Deviation detected';
}

// -----------------------------------------------------------------------
// Main: generateActionPlanWithDeviations
// -----------------------------------------------------------------------

function generateActionPlanWithDeviations(dbInstance, auditId, callback, autoCreate = true) {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  const query = `
    SELECT 
      ai.id as audit_item_id,
      ai.item_id,
      ai.audit_id,
      ai.status,
      ai.selected_option_id,
      ai.mark,
      ai.comment,
      ai.photo_url,
      ai.time_entries,
      ai.average_time_minutes,
      ci.title,
      ci.description,
      ci.category,
      ci.section,
      ci.is_critical,
      ci.required,
      ci.weight,
      ci.is_time_based,
      ci.target_time_minutes,
      cio.option_text as selected_option_text,
      cio.mark as selected_mark,
      (SELECT MAX(${isSqlServer ? 'TRY_CAST(mark AS FLOAT)' : 'CAST(mark AS REAL)'}) 
       FROM checklist_item_options 
       WHERE item_id = ci.id AND mark NOT IN ('NA', 'N/A', '')) as max_mark
    FROM audit_items ai
    JOIN checklist_items ci ON ai.item_id = ci.id
    LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
    WHERE ai.audit_id = ?
  `;

  dbInstance.all(query, [auditId], (err, allItems) => {
    if (err) {
      logger.error('[Action Plan] Error fetching audit items:', err);
      return callback(err);
    }

    const deviationsWithScore = (allItems || []).map(item => {
      const selectedMark      = item.selected_mark || item.mark || '';
      const selectedOptionText = item.selected_option_text || '';
      const parsedMark  = parseFloat(selectedMark);
      const numericMark = Number.isFinite(parsedMark) ? parsedMark : null;
      const maxMark     = parseFloat(item.max_mark) || 3;
      const isCritical  = item.is_critical === 1 || item.is_critical === true;
      const isRequired  = item.required    === 1 || item.required    === true;
      const categoryText = String(item.category || '').toUpperCase();
      const isSpeedOfService = categoryText.includes('SPEED OF SERVICE');
      const isAvgSection     = String(item.section || '').toLowerCase().includes('avg');
      const avgMinutes = (item.average_time_minutes !== null && item.average_time_minutes !== undefined)
        ? Number(item.average_time_minutes)
        : computeAverageMinutes(item.time_entries);
      const defaultSlaMinutes = Number(process.env.SPEED_OF_SERVICE_SLA_MINUTES || process.env.SOS_SLA_MINUTES || 2);
      const targetMinutes = Number(item.target_time_minutes) || defaultSlaMinutes;
      const acknowledgementCategory = isAcknowledgementCategory(item.category);

      let deviationFlag = false;
      let speedOfServiceBreach = false;
      const isAnswerNo       = String(selectedOptionText || '').trim().toLowerCase() === 'no';
      const isMissingAnswer  = !item.selected_option_id && !item.mark && !item.comment && !item.photo_url;
      const acknowledgementMissing = acknowledgementCategory && isMissingAnswer;

      if (selectedMark === '0' || numericMark === 0 || isAnswerNo) deviationFlag = true;
      if (isCritical && numericMark !== null && numericMark < maxMark) deviationFlag = true;
      if (isRequired && isMissingAnswer) deviationFlag = true;
      if (isSpeedOfService && isAvgSection && Number.isFinite(avgMinutes) && avgMinutes > targetMinutes) {
        deviationFlag = true;
        speedOfServiceBreach = true;
      }
      if (acknowledgementMissing) deviationFlag = true;
      if (!deviationFlag) return null;

      const severity        = determineSeverity(isCritical, item.category);
      const deviationReason = getDeviationReason(item, selectedMark, isCritical, isRequired, maxMark, speedOfServiceBreach, acknowledgementMissing, selectedOptionText);
      const scoreLoss       = computeScoreLoss(numericMark, maxMark, isMissingAnswer, avgMinutes, targetMinutes);
      const businessPriority = getBusinessPriorityWeight(item.category);
      const ownerRole       = determineOwnerRole(item.category);
      const rootCause       = deviationReason || `Process gap detected in ${item.category || 'General'}`;
      const preventiveAction = `Implement daily checks and training for ${item.category || 'this category'}`;

      return {
        item_id: item.item_id,
        audit_item_id: item.audit_item_id,
        title: item.title,
        description: item.description,
        category: item.category,
        is_critical: isCritical,
        required: isRequired,
        deviation_flag: true,
        severity: severity.label,
        severity_level: severity.level,
        priority: severity.priority,
        deviation_score: severity.level,
        deviation_reason: deviationReason,
        selected_option: selectedOptionText,
        mark: selectedMark,
        max_mark: maxMark,
        score_loss: scoreLoss,
        business_priority: businessPriority,
        owner_role: ownerRole,
        root_cause: rootCause,
        preventive_action: preventiveAction,
        comment: item.comment,
        photo_url: item.photo_url,
        weight: item.weight || 1,
      };
    }).filter(Boolean);

    // Rank deviations
    deviationsWithScore.sort((a, b) => {
      if (b.deviation_score !== a.deviation_score) return b.deviation_score - a.deviation_score;
      if ((b.score_loss || 0) !== (a.score_loss || 0)) return (b.score_loss || 0) - (a.score_loss || 0);
      if ((b.business_priority || 0) !== (a.business_priority || 0)) return (b.business_priority || 0) - (a.business_priority || 0);
      if (b.is_critical !== a.is_critical) return b.is_critical ? 1 : -1;
      const aScore = Number.isFinite(parseFloat(a.mark)) ? parseFloat(a.mark) : 0;
      const bScore = Number.isFinite(parseFloat(b.mark)) ? parseFloat(b.mark) : 0;
      return aScore - bScore;
    });

    const top3Deviations = deviationsWithScore.slice(0, 3);
    logger.info(`[Action Plan] Audit ${auditId}: Found ${deviationsWithScore.length} total deviations, selected Top ${top3Deviations.length}`);

    if (autoCreate && top3Deviations.length > 0) {
      _autoCreateActionPlan(dbInstance, auditId, top3Deviations, deviationsWithScore, callback);
    } else {
      callback(null, {
        audit_id: auditId,
        deviations: top3Deviations,
        total_deviations: deviationsWithScore.length,
        top3_count: top3Deviations.length,
      });
    }
  });
}

/** Internal: auto-create action plan DB rows for top-3 deviations */
function _autoCreateActionPlan(dbInstance, auditId, top3, allDeviations, callback) {
  dbInstance.get(
    'SELECT COUNT(*) as count FROM action_plan WHERE audit_id = ?',
    [auditId],
    (countErr, countResult) => {
      const base = {
        audit_id: auditId,
        deviations: top3,
        total_deviations: allDeviations.length,
        top3_count: top3.length,
      };

      if (countErr) {
        logger.error('[Action Plan] Error checking existing action plan:', countErr);
        return callback(null, base);
      }
      if (countResult.count > 0) {
        return callback(null, { ...base, action_plan_existing: countResult.count });
      }

      dbInstance.get(
        `SELECT a.completed_at, u.name as auditor_name
         FROM audits a LEFT JOIN users u ON a.user_id = u.id
         WHERE a.id = ?`,
        [auditId],
        (auditErr, auditRow) => {
          if (auditErr) {
            logger.error('[Action Plan] Error fetching audit info:', auditErr);
            return callback(null, base);
          }

          const baseDate    = auditRow?.completed_at ? new Date(auditRow.completed_at) : new Date();
          const auditorName = auditRow?.auditor_name || 'Auditor';

          const insertPromises = top3.map((deviation) => new Promise((resolve, reject) => {
            const correctiveAction = deviation.comment || deviation.deviation_reason || `Corrective action required for: ${deviation.title}`;
            const preventiveAction = deviation.preventive_action || `Prevent recurrence in ${deviation.category || 'this category'}`;
            const rootCause = deviation.root_cause || deviation.deviation_reason || `Process gap detected in ${deviation.category || 'General'}`;
            const ownerRole = deviation.owner_role || 'Store Manager';
            const targetDate = new Date(baseDate);
            targetDate.setDate(targetDate.getDate() + getTargetDaysForSeverity(deviation.severity));
            const targetDateStr = targetDate.toISOString().split('T')[0];

            dbInstance.run(
              `INSERT INTO action_plan (
                audit_id, item_id, checklist_category, checklist_question,
                deviation_reason, severity, root_cause, corrective_action,
                preventive_action, owner_role, responsible_person,
                responsible_person_id, target_date, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                auditId, deviation.item_id, deviation.category, deviation.title,
                deviation.deviation_reason, deviation.severity, rootCause,
                correctiveAction, preventiveAction, ownerRole,
                auditorName, null, targetDateStr, 'OPEN',
              ],
              function (insertErr) {
                if (insertErr) { logger.error('[Action Plan] Error creating action plan entry:', insertErr); reject(insertErr); }
                else           { resolve(this.lastID); }
              }
            );
          }));

          Promise.all(insertPromises)
            .then((createdIds) => {
              logger.info(`[Action Plan] Created ${createdIds.length} action plan entries for audit ${auditId}`);
              callback(null, { ...base, action_plan_created: createdIds.length });
            })
            .catch((insertErr) => {
              logger.error('[Action Plan] Error in batch insert:', insertErr);
              callback(null, base);
            });
        }
      );
    }
  );
}

module.exports = {
  SEVERITY_CONFIG,
  MAJOR_SEVERITY_CATEGORIES,
  BUSINESS_PRIORITY_ORDER,
  normalizeCategoryForPriority,
  getBusinessPriorityWeight,
  isAcknowledgementCategory,
  determineOwnerRole,
  getTargetDaysForSeverity,
  computeScoreLoss,
  determineSeverity,
  getDeviationReason,
  generateActionPlanWithDeviations,
};
