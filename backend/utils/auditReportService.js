const db = require('../config/database-loader');
const logger = require('./logger');

const APP_NAME = process.env.APP_NAME || 'LBF Audit App';

const MAJOR_CATEGORIES = [
  { name: 'QUALITY', match: ['quality'] },
  { name: 'SERVICE', match: ['service'] },
  { name: 'HYGIENE & CLEANLINESS', match: ['hygiene', 'cleanliness'] },
  { name: 'PROCESSES', match: ['process'] }
];

const NON_SCORED_INPUT_TYPES = new Set(['text', 'textarea', 'comment', 'note']);

const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeCategoryKey = (value) => normalizeText(value).toLowerCase();

const isNonScoredInputType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return NON_SCORED_INPUT_TYPES.has(normalized);
};

const parseMultiSelectionComment = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.selections)) {
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        selections: parsed.selections
      };
    }
  } catch (err) {
    return null;
  }
  return null;
};

const normalizeMultiSelectionComment = (item) => {
  if (!item || !item.comment) return item?.comment || '';
  const inputType = String(item.input_type || '').toLowerCase();
  if (inputType !== 'multiple_answer' && inputType !== 'grid') return item.comment;
  const parsed = parseMultiSelectionComment(item.comment);
  return parsed ? (parsed.text || '') : item.comment;
};

const mapToMajorCategory = (category) => {
  const normalized = normalizeCategoryKey(category);
  if (!normalized) return 'PROCESSES';
  if (normalized.includes('speed of service') || normalized.includes('tracking')) return null;
  if (normalized.includes('temperature')) return null;
  if (normalized.includes('acknowledg')) return null;
  const match = MAJOR_CATEGORIES.find(entry => entry.match.some(token => normalized.includes(token)));
  return match ? match.name : 'PROCESSES';
};

const parseNumeric = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toISOString();
};

const getResponseLabel = (item) => {
  const selected = String(item.selected_option_text || '').trim();
  const mark = item.mark;
  const markText = String(mark || '').trim().toUpperCase();
  if (selected) return selected;
  if (markText === 'NA' || markText === 'N/A') return 'NA';
  const markNum = parseNumeric(mark);
  if (markNum === null) return '';
  return markNum > 0 ? 'Yes' : 'No';
};

const buildTodoText = (remarks) => {
  const cleaned = normalizeText(remarks)
    .replace(/^remarks?:/i, '')
    .replace(/\.$/, '');
  if (!cleaned) return 'Address the audit deviation noted for this item.';
  return cleaned.match(/^(fix|resolve|ensure|verify|correct|repair|clean|replace|train)\b/i)
    ? cleaned
    : `Resolve: ${cleaned}`;
};

const pickAssignedTo = (category) => {
  const normalized = normalizeCategoryKey(category);
  if (normalized.includes('service') || normalized.includes('process')) return 'Store Manager';
  return 'Auditor';
};

const safeAll = async (dbInstance, sql, params = []) => {
  return new Promise((resolve) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) return resolve({ rows: [], error: err });
      resolve({ rows: rows || [], error: null });
    });
  });
};

const safeGet = async (dbInstance, sql, params = []) => {
  return new Promise((resolve) => {
    dbInstance.get(sql, params, (err, row) => {
      if (err) return resolve({ row: null, error: err });
      resolve({ row: row || null, error: null });
    });
  });
};

const normalizeTimeValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (!text) return null;
  if (text.includes(':')) {
    const parts = text.split(':').map(part => parseFloat(part));
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      return (parts[0] * 60) + parts[1];
    }
  }
  const numeric = parseNumeric(text);
  return numeric !== null ? numeric : null;
};

const groupSpeedOfService = (logs) => {
  const grouped = {};
  logs.forEach((row) => {
    const transaction = normalizeText(row.transaction_label || row.transaction_name || row.section || row.group_label || row.transaction || row.trnx_label || 'Trnx-1');
    if (!grouped[transaction]) grouped[transaction] = [];
    const checkpoint = normalizeText(row.checkpoint || row.checkpoint_label || row.title || row.name || row.step || 'Checkpoint');
    const timeValue = row.time_value || row.time || row.duration || row.duration_seconds || row.seconds;
    const secondsValue = row.seconds || row.duration_seconds || normalizeTimeValue(timeValue);
    grouped[transaction].push({
      checkpoint,
      time_value: timeValue,
      seconds: normalizeTimeValue(secondsValue)
    });
  });
  return Object.entries(grouped).map(([name, entries]) => {
    const secondsValues = entries.map(entry => entry.seconds).filter(Number.isFinite);
    const averageSeconds = secondsValues.length
      ? Math.round((secondsValues.reduce((acc, val) => acc + val, 0) / secondsValues.length) * 100) / 100
      : null;
    return { name, entries, averageSeconds };
  });
};

const buildSpeedOfServiceFromItems = (items) => {
  const sosItems = items.filter(item => normalizeCategoryKey(item.category).includes('speed of service'));
  const logs = [];
  sosItems.forEach(item => {
    let parsed = null;
    if (item.time_entries) {
      try {
        parsed = JSON.parse(item.time_entries);
      } catch (err) {
        parsed = null;
      }
    }
    if (Array.isArray(parsed)) {
      parsed.forEach(entry => {
        logs.push({
          transaction_label: item.section || item.subcategory || 'Trnx-1',
          checkpoint: entry.label || entry.checkpoint || item.title,
          time_value: entry.time || entry.value || entry.seconds,
          seconds: entry.seconds || entry.value
        });
      });
    } else {
      // For CVR format: extract value from comment (time entries), mark, or selected_option_text
      // IMPORTANT: mark is often 'NA' or 'N/A' for answer-type items (SOS time entries),
      // so we prioritize comment which holds the actual time value entered by the user
      const markValue = item.mark && item.mark !== 'NA' && item.mark !== 'N/A' && item.mark !== '' ? item.mark : null;
      const rawValue = item.comment || markValue || item.selected_option_text || '';
      const timeValue = rawValue !== '' && rawValue !== null && rawValue !== 'NA' ? rawValue : '';
      const seconds = normalizeTimeValue(timeValue);
      
      // Extract transaction number from section (e.g., "Trnx-1", "Trnx-2") or subcategory
      let transactionLabel = item.section || item.subcategory || 'Trnx-1';
      
      // Normalize transaction label to match expected format
      if (!transactionLabel.toLowerCase().includes('trnx') && !transactionLabel.toLowerCase().includes('avg')) {
        // Try to extract from title if it contains transaction info
        const titleLower = (item.title || '').toLowerCase();
        if (titleLower.includes('average') || titleLower.includes('avg')) {
          transactionLabel = 'Avg';
        }
      }
      
      logs.push({
        transaction_label: transactionLabel,
        checkpoint: item.title || 'Checkpoint',
        time_value: timeValue,
        seconds: seconds
      });
    }
  });
  return groupSpeedOfService(logs);
};

const groupTemperatureTracking = (logs) => {
  const grouped = {};
  logs.forEach((row) => {
    const transaction = normalizeText(row.transaction_label || row.transaction_name || row.section || row.group_label || row.transaction || row.trnx_label || 'Trnx-1');
    if (!grouped[transaction]) grouped[transaction] = [];
    const label = normalizeText(row.item_label || row.food_item || row.title || row.name || row.subcategory || 'Item');
    const tempValue = row.temperature || row.temp || row.value || row.reading;
    grouped[transaction].push({
      label,
      temperature: parseNumeric(tempValue),
      raw: tempValue,
      type: normalizeText(row.type || row.category || row.temperature_type)
    });
  });
  return Object.entries(grouped).map(([name, entries]) => {
    const numericTemps = entries.map(entry => entry.temperature).filter(Number.isFinite);
    const averageTemp = numericTemps.length
      ? Math.round((numericTemps.reduce((acc, val) => acc + val, 0) / numericTemps.length) * 10) / 10
      : null;
    return { name, entries, averageTemp };
  });
};

const buildTemperatureTrackingFromItems = (items) => {
  const tempItems = items.filter(item => normalizeCategoryKey(item.category).includes('temperature'));
  const logs = tempItems.map(item => ({
    transaction_label: item.section || item.subcategory || 'Trnx-1',
    item_label: item.title || 'Item',
    temperature: parseNumeric(item.comment || item.selected_option_text || item.mark),
    type: item.subcategory || item.section
  }));
  return groupTemperatureTracking(logs);
};

const buildActionPlan = (items, audit) => {
  const dueDate = audit.completed_at || audit.created_at;
  // Calculate due date as 7 days from audit completion
  const dueDateObj = new Date(dueDate);
  dueDateObj.setDate(dueDateObj.getDate() + 7);
  const targetDueDate = dueDateObj.toISOString();
  
  const deviations = items
    .map(item => {
      const maxScore = parseNumeric(item.maxScore) || 0;
      const actualScore = parseNumeric(item.mark) || 0;
      const response = getResponseLabel(item);
      const isNo = response.toLowerCase() === 'no';
      const isBelowPerfect = maxScore > 0 && actualScore < maxScore;
      const isCritical = item.is_critical === 1 || item.is_critical === true;
      
      if (!isNo && !isBelowPerfect) return null;
      
      // Calculate severity based on score deviation and critical flag
      let severity = 'MAJOR';
      if (isCritical) {
        severity = 'CRITICAL';
      } else if (actualScore === 0 && maxScore > 0) {
        severity = 'MAJOR';
      } else if (actualScore < maxScore * 0.5) {
        severity = 'MAJOR';
      } else {
        severity = 'MINOR';
      }
      
      // Calculate deviation weight for sorting (higher = more severe)
      const deviationWeight = (isCritical ? 100 : 0) + (maxScore - actualScore);
      
      // Build corrective action text from remarks or generate default
      const correctiveActionText = buildTodoText(item.comment || '');
      
      return {
        question: item.title || '',
        remarks: item.comment || '',
        // Use corrective action text as primary todo (what View Report expects)
        todo: correctiveActionText,
        // Also keep correctiveAction for backward compatibility
        correctiveAction: correctiveActionText,
        assignedTo: pickAssignedTo(item.category),
        dueDate: targetDueDate,
        status: 'Open',
        response,
        score: `${actualScore}/${maxScore}`,
        category: item.category || 'Quality',
        severity,
        deviationWeight,
        isCritical
      };
    })
    .filter(Boolean)
    // Sort by deviation weight (critical items first, then by score deviation)
    .sort((a, b) => b.deviationWeight - a.deviationWeight);
  
  return deviations;
};

const normalizeSignatureData = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (raw.startsWith('data:image')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `data:image/png;base64,${raw}`;
};

async function getAuditReportData(auditId, options = {}) {
  const dbInstance = db.getDb();
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  const { row: audit, error: auditError } = await safeGet(
    dbInstance,
    `SELECT a.*, ct.name as template_name, ct.category as template_category,
            u.name as auditor_name, u.email as auditor_email,
            l.name as location_name, l.store_number, l.city, l.state
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN locations l ON a.location_id = l.id
     WHERE a.id = ?`,
    [auditId]
  );

  if (auditError || !audit) {
    throw auditError || new Error('Audit not found');
  }

  const { rows: items } = await safeAll(
    dbInstance,
    `SELECT 
        ai.id as audit_item_id,
        ai.item_id,
        ai.status,
        ai.selected_option_id,
        ai.mark,
        ai.comment,
        ai.photo_url,
        ai.time_entries,
        ai.average_time_minutes,
        ai.time_taken_minutes,
        ai.started_at,
        ci.title,
        ci.description,
        ci.category,
        ci.subcategory,
        ci.section,
        ci.is_critical,
        ci.required,
        ci.weight,
        ci.input_type,
        ci.order_index,
        cio.option_text as selected_option_text,
        cio.mark as selected_mark,
        (SELECT MAX(${isSqlServer ? 'TRY_CAST(mark AS FLOAT)' : 'CAST(mark AS REAL)'}) 
         FROM checklist_item_options 
         WHERE item_id = ci.id AND mark NOT IN ('NA', 'N/A', '')) as max_mark
     FROM audit_items ai
     JOIN checklist_items ci ON ai.item_id = ci.id
     LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
     WHERE ai.audit_id = ?
     ORDER BY ci.order_index, ci.id`,
    [auditId]
  );

  const itemsWithScores = items.map(item => ({
    ...item,
    comment: normalizeMultiSelectionComment(item),
    nonScored: isNonScoredInputType(item.input_type),
    maxScore: isNonScoredInputType(item.input_type)
      ? 0
      : parseNumeric(item.max_mark) || parseNumeric(item.selected_mark) || 3
  }));

  let totalPerfect = 0;
  let totalActual = 0;

  const scoreByCategory = {};
  const detailedCategories = {};

  itemsWithScores.forEach(item => {
    const maxScore = parseNumeric(item.maxScore) || 0;
    const actualScore = parseNumeric(item.mark) || 0;
    if (!item.nonScored && maxScore > 0) {
      totalPerfect += maxScore;
      totalActual += actualScore;
    }

    const majorCategory = mapToMajorCategory(item.category);
    if (!majorCategory) return;

    if (!scoreByCategory[majorCategory]) {
      scoreByCategory[majorCategory] = { name: majorCategory, perfectScore: 0, actualScore: 0 };
    }

    if (!item.nonScored && maxScore > 0) {
      scoreByCategory[majorCategory].perfectScore += maxScore;
      scoreByCategory[majorCategory].actualScore += actualScore;
    }

    if (!detailedCategories[majorCategory]) {
      detailedCategories[majorCategory] = {};
    }
    const subsection = normalizeText(item.subcategory || item.section || 'General');
    if (!detailedCategories[majorCategory][subsection]) {
      detailedCategories[majorCategory][subsection] = { items: [], perfectScore: 0, actualScore: 0 };
    }
    detailedCategories[majorCategory][subsection].items.push(item);
    if (!item.nonScored && maxScore > 0) {
      detailedCategories[majorCategory][subsection].perfectScore += maxScore;
      detailedCategories[majorCategory][subsection].actualScore += actualScore;
    }
  });

  const scoreByCategoryList = Object.values(scoreByCategory).map(entry => ({
    ...entry,
    percentage: entry.perfectScore > 0 ? Math.round((entry.actualScore / entry.perfectScore) * 100) : 0
  }));

  const detailedList = Object.entries(detailedCategories).map(([categoryName, subsections]) => {
    const subsectionList = Object.entries(subsections).map(([subsectionName, data]) => ({
      name: subsectionName,
      actualScore: data.actualScore,
      perfectScore: data.perfectScore,
      percentage: data.perfectScore > 0 ? Math.round((data.actualScore / data.perfectScore) * 100) : 0,
      items: data.items
    }));
    const actualScore = subsectionList.reduce((sum, sub) => sum + sub.actualScore, 0);
    const perfectScore = subsectionList.reduce((sum, sub) => sum + sub.perfectScore, 0);
    return {
      name: categoryName,
      actualScore,
      perfectScore,
      percentage: perfectScore > 0 ? Math.round((actualScore / perfectScore) * 100) : 0,
      subsections: subsectionList
    };
  });

  const { rows: sosLogs, error: sosError } = await safeAll(
    dbInstance,
    'SELECT * FROM speed_of_service_logs WHERE audit_id = ? ORDER BY id ASC',
    [auditId]
  );
  if (sosError) logger.debug('[Report] speed_of_service_logs unavailable:', sosError.message);
  const speedOfService = sosLogs.length ? groupSpeedOfService(sosLogs) : buildSpeedOfServiceFromItems(itemsWithScores);

  const { rows: tempLogs, error: tempError } = await safeAll(
    dbInstance,
    'SELECT * FROM temperature_tracking_logs WHERE audit_id = ? ORDER BY id ASC',
    [auditId]
  );
  if (tempError) logger.debug('[Report] temperature_tracking_logs unavailable:', tempError.message);
  const temperatureTracking = tempLogs.length ? groupTemperatureTracking(tempLogs) : buildTemperatureTrackingFromItems(itemsWithScores);

  const { rows: signatures } = await safeAll(
    dbInstance,
    'SELECT signer_name, signer_role, signature_data, signed_at FROM audit_signatures WHERE audit_id = ? ORDER BY id ASC',
    [auditId]
  );
  const managerSignature = signatures.find(sig => normalizeCategoryKey(sig.signer_role).includes('manager')) || signatures[0] || null;

  // Build acknowledgement data from audit_signatures table first, 
  // then fall back to extracting from item responses (ACKNOWLEDGEMENT category)
  let acknowledgement = {
    managerName: managerSignature ? managerSignature.signer_name : '',
    signatureData: managerSignature ? normalizeSignatureData(managerSignature.signature_data) : '',
    signedAt: managerSignature ? managerSignature.signed_at : ''
  };

  // If no signature record exists in audit_signatures table, try to build from items
  if (!managerSignature) {
    const ackItems = itemsWithScores.filter(item => 
      item.category && normalizeCategoryKey(item.category).includes('acknowledg')
    );
    ackItems.forEach(item => {
      const titleLower = (item.title || '').toLowerCase();
      if (titleLower.includes('manager') || titleLower.includes('duty')) {
        // Manager name from comment field
        if (item.comment && item.comment.trim()) {
          acknowledgement.managerName = item.comment.trim();
        }
      } else if (titleLower.includes('signature') || titleLower.includes('sign')) {
        // Signature data from comment field (stored as JSON)
        if (item.comment && item.comment.trim()) {
          try {
            const sigData = JSON.parse(item.comment);
            if (sigData && (sigData.uri || sigData.base64 || sigData.data)) {
              acknowledgement.signatureData = sigData.uri || sigData.base64 || sigData.data || '';
            } else if (sigData && Array.isArray(sigData.paths) && sigData.paths.length > 0) {
              // Mobile app stores signature as SVG path data
              // Convert paths to a simple SVG data URI for rendering
              const w = sigData.width || 300;
              const h = sigData.height || 200;
              const pathElements = sigData.paths.map(d => 
                `<path d="${d}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
              ).join('');
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${pathElements}</svg>`;
              const svgBase64 = Buffer.from(svg).toString('base64');
              acknowledgement.signatureData = `data:image/svg+xml;base64,${svgBase64}`;
            }
          } catch (e) {
            // Not JSON, might be a direct base64 or URI string
            if (item.comment.startsWith('data:') || item.comment.length > 100) {
              acknowledgement.signatureData = item.comment;
            }
          }
        }
      }
    });
  }

  const { rows: actionPlanRows, error: actionPlanError } = await safeAll(
    dbInstance,
    'SELECT * FROM action_plan WHERE audit_id = ? ORDER BY id ASC',
    [auditId]
  );

  if (actionPlanError) {
    logger.debug('[Report] action_plan unavailable:', actionPlanError.message);
  }

  const actionPlan = (actionPlanRows || []).map(row => ({
    question: row.checklist_question || '',
    remarks: row.deviation_reason || '',
    todo: row.corrective_action || '',
    correctiveAction: row.corrective_action || '',
    assignedTo: row.responsible_person || row.owner_role || 'Store Manager',
    dueDate: row.target_date || '',
    status: row.status || 'OPEN',
    category: row.checklist_category || 'Quality',
    severity: row.severity || 'MINOR',
    deviationWeight: 0,
    isCritical: String(row.severity || '').toUpperCase() === 'CRITICAL'
  }));

  return {
    appName: APP_NAME,
    audit: {
      id: audit.id,
      templateName: audit.template_name,
      outletName: audit.restaurant_name || audit.location_name || 'N/A',
      outletCode: audit.store_number || '',
      city: audit.city || '',
      startDate: formatDate(audit.created_at),
      endDate: formatDate(audit.completed_at || audit.created_at),
      submittedBy: audit.auditor_name || audit.auditor_email || 'N/A',
      completedAt: audit.completed_at || audit.created_at
    },
    summary: {
      overallPercentage: totalPerfect > 0 ? Math.round((totalActual / totalPerfect) * 1000) / 10 : 0,
      totalActual: totalActual,
      totalPerfect: totalPerfect
    },
    scoreByCategory: scoreByCategoryList,
    detailedCategories: detailedList,
    speedOfService,
    temperatureTracking,
    acknowledgement,
    actionPlan,
    items: itemsWithScores
  };
}

module.exports = {
  getAuditReportData
};
