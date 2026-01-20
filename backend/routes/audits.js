const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { isAdminUser } = require('../middleware/permissions');
const logger = require('../utils/logger');

// Calculate score from average time (minutes). Uses target as the "excellent" threshold.
// Example with target=2:
// <2 => 100, 2-3 => 90, 3-4 => 80, 4-5 => 70, >5 => 70 - ((t-5)*10)
const calculateTimeBasedScore = (averageTimeMinutes, targetTimeMinutes = 2) => {
  const avg = Number(averageTimeMinutes);
  if (!Number.isFinite(avg) || avg <= 0) return null;

  const target = Number(targetTimeMinutes);
  const t = Number.isFinite(target) && target > 0 ? target : 2;

  if (avg < t) return 100;
  if (avg < t + 1) return 90;
  if (avg < t + 2) return 80;
  if (avg < t + 3) return 70;

  const score = 70 - ((avg - (t + 3)) * 10);
  return Math.max(0, Math.round(score));
};

const parseTimeEntriesToArray = (time_entries) => {
  if (time_entries === undefined || time_entries === null) return [];
  if (Array.isArray(time_entries)) return time_entries;
  if (typeof time_entries === 'string') {
    try {
      const parsed = JSON.parse(time_entries);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const computeAverageMinutes = (time_entries) => {
  const entries = parseTimeEntriesToArray(time_entries)
    .map(t => Number(t))
    .filter(t => Number.isFinite(t) && t > 0);
  if (entries.length === 0) return null;
  const avg = entries.reduce((sum, t) => sum + t, 0) / entries.length;
  return Math.round(avg * 100) / 100;
};

const parseInfoNotes = (notes) => {
  if (!notes) return null;
  if (typeof notes === 'object') return notes;
  if (typeof notes !== 'string') return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const validateInfoStepNotes = (notes) => {
  const parsed = parseInfoNotes(notes);
  if (!parsed) return null;
  const hasInfoFields = ['attendees', 'pointsDiscussed', 'infoPictures']
    .some(key => Object.prototype.hasOwnProperty.call(parsed, key));
  if (!hasInfoFields) return null;

  const attendees = String(parsed.attendees || '').trim();
  const pointsDiscussed = String(parsed.pointsDiscussed || '').trim();
  const infoPictures = Array.isArray(parsed.infoPictures) ? parsed.infoPictures : [];

  // Only require attendees and pointsDiscussed - pictures are optional
  if (!attendees || !pointsDiscussed) {
    return {
      error: 'Info step data is incomplete',
      details: {
        hasAttendees: !!attendees,
        hasPointsDiscussed: !!pointsDiscussed,
        pictureCount: infoPictures.length
      }
    };
  }
  return null;
};

const getNextScheduledDate = (currentDate, frequency) => {
  if (!frequency) return null;
  const date = new Date(currentDate || new Date());
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split('T')[0];
};

const markScheduledAuditInProgress = (dbInstance, scheduleId) => {
  if (!scheduleId) return;
  dbInstance.run(
    'UPDATE scheduled_audits SET status = ? WHERE id = ?',
    ['in_progress', scheduleId],
    (err) => {
      if (err) {
        logger.error('Error updating scheduled audit status to in_progress:', err.message);
      }
    }
  );
};

const handleScheduledAuditCompletion = (dbInstance, auditId, auditStatus = null) => {
  // Helper function to process scheduled audit update
  const processScheduledAuditUpdate = (scheduleId) => {
    dbInstance.get(
      'SELECT id, frequency, scheduled_date, status FROM scheduled_audits WHERE id = ?',
      [scheduleId],
      (scheduleErr, schedule) => {
        if (scheduleErr) {
          logger.error('Error fetching scheduled audit for completion:', scheduleErr.message);
          return;
        }
        if (!schedule) {
          logger.warn(`[Scheduled Audit Completion] Scheduled audit ${scheduleId} not found`);
          return;
        }

        logger.info(`[Scheduled Audit Completion] Schedule ID: ${scheduleId}, Frequency: ${schedule.frequency}, Current Status: ${schedule.status}, Audit ID: ${auditId}`);

        if (!schedule.frequency || schedule.frequency === 'once') {
          // One-time audit: mark as completed
          dbInstance.run(
            'UPDATE scheduled_audits SET status = ? WHERE id = ?',
            ['completed', scheduleId],
            function(updateErr) {
              if (updateErr) {
                logger.error(`[Scheduled Audit Completion] Error marking scheduled audit ${scheduleId} as completed:`, updateErr.message);
              } else {
                logger.info(`[Scheduled Audit Completion] Successfully marked schedule ${scheduleId} as completed (rows affected: ${this.changes})`);
              }
            }
          );
        } else {
          // Recurring audit: advance to next date and reset to pending
          const nextDate = getNextScheduledDate(schedule.scheduled_date, schedule.frequency);
          logger.debug(`[Scheduled Audit Completion] Recurring audit - advancing to next date: ${nextDate}`);
          
          if (!nextDate) {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ? WHERE id = ?',
              ['pending', scheduleId],
              function(updateErr) {
                if (updateErr) {
                  logger.error(`[Scheduled Audit Completion] Error resetting scheduled audit ${scheduleId} status:`, updateErr.message);
                } else {
                  logger.info(`[Scheduled Audit Completion] Successfully reset schedule ${scheduleId} to pending (rows affected: ${this.changes})`);
                }
              }
            );
          } else {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ?, scheduled_date = ?, next_run_date = ? WHERE id = ?',
              ['pending', nextDate, nextDate, scheduleId],
              function(updateErr) {
                if (updateErr) {
                  logger.error(`[Scheduled Audit Completion] Error advancing scheduled audit ${scheduleId} date:`, updateErr.message);
                } else {
                  logger.info(`[Scheduled Audit Completion] Successfully advanced schedule ${scheduleId} to ${nextDate} with pending status (rows affected: ${this.changes})`);
                }
              }
            );
          }
        }
      }
    );
  };

  // If auditStatus is provided and is 'completed', use it directly (from the update that just happened)
  // Otherwise, read from database (for backward compatibility)
  if (auditStatus === 'completed') {
    // Status is already confirmed as completed, just get scheduled_audit_id
    dbInstance.get(
      'SELECT scheduled_audit_id FROM audits WHERE id = ?',
      [auditId],
      (err, auditRow) => {
        if (err) {
          logger.error('Error fetching audit for schedule completion:', err.message);
          return;
        }
        if (!auditRow || !auditRow.scheduled_audit_id) {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} has no scheduled_audit_id. Skipping.`);
          return;
        }
        processScheduledAuditUpdate(auditRow.scheduled_audit_id);
      }
    );
  } else {
    // Fallback: read status from database
    dbInstance.get(
      'SELECT scheduled_audit_id, status FROM audits WHERE id = ?',
      [auditId],
      (err, auditRow) => {
        if (err) {
          logger.error('Error fetching audit for schedule completion:', err.message);
          return;
        }
        if (!auditRow) {
          logger.warn(`[Scheduled Audit Completion] Audit ${auditId} not found`);
          return;
        }
        
        // Only update scheduled audit if the audit is actually completed
        if (auditRow.status !== 'completed') {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} status is '${auditRow.status}', not 'completed'. Skipping scheduled audit update.`);
          return;
        }
        
        if (!auditRow.scheduled_audit_id) {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} has no scheduled_audit_id. Skipping.`);
          return;
        }

        processScheduledAuditUpdate(auditRow.scheduled_audit_id);
      }
    );
  }
};

/**
 * Generate Action Plan with top-3 deviations for a completed audit
 */
function generateActionPlanWithDeviations(dbInstance, auditId, callback) {
  // Get failed items (items with mark = 0 or status = 'failed')
  dbInstance.all(
    `SELECT ai.*, ci.title, ci.description, ci.category, ci.is_critical,
            cio.option_text as selected_option_text, cio.mark as selected_mark,
            ai.comment, ai.photo_url
     FROM audit_items ai
     JOIN checklist_items ci ON ai.item_id = ci.id
     LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
     WHERE ai.audit_id = ?
       AND (
         ai.status = 'failed' 
         OR ai.mark = '0' 
         OR (cio.mark IS NOT NULL AND cio.mark IN ('No', 'N', 'NA', 'N/A', 'Fail', 'F', '0'))
         OR (ai.mark IS NOT NULL AND parseFloat(ai.mark) = 0)
       )
     ORDER BY 
       CASE WHEN ci.is_critical = 1 THEN 0 ELSE 1 END,
       CASE WHEN ai.mark IS NOT NULL THEN parseFloat(ai.mark) ELSE 999 END ASC,
       ci.category
     LIMIT 3`,
    [auditId],
    (err, failedItems) => {
      if (err) {
        return callback(err);
      }

      const deviations = (failedItems || []).map(item => ({
        item_id: item.item_id,
        title: item.title,
        description: item.description,
        category: item.category,
        is_critical: item.is_critical,
        selected_option: item.selected_option_text,
        mark: item.selected_mark || item.mark,
        comment: item.comment,
        photo_url: item.photo_url
      }));

      callback(null, {
        audit_id: auditId,
        deviations: deviations,
        total_deviations: deviations.length
      });
    }
  );
}

const router = express.Router();


// Get all audits for current user with filters (admins see all audits)
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { status, restaurant, template_id, date_from, date_to, min_score, max_score, page, limit } = req.query;
  
  // Pagination settings
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Max 100 per page
  const offset = (pageNum - 1) * limitNum;
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  let baseQuery = `FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN locations l ON a.location_id = l.id
               LEFT JOIN users u ON a.user_id = u.id`;
  
  // Admins see all audits, regular users only see their own
  let params = [];
  if (isAdmin) {
    baseQuery += ` WHERE 1=1`;
  } else {
    baseQuery += ` WHERE a.user_id = ?`;
    params = [userId];
  }

  // Apply filters
  if (status) {
    baseQuery += ' AND a.status = ?';
    params.push(status);
  }
  if (restaurant) {
    baseQuery += ' AND a.restaurant_name LIKE ?';
    params.push(`%${restaurant}%`);
  }
  if (template_id) {
    baseQuery += ' AND a.template_id = ?';
    params.push(template_id);
  }
  if (date_from) {
    if (isSqlServer) {
      baseQuery += ' AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      baseQuery += ' AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (isSqlServer) {
      baseQuery += ' AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      baseQuery += ' AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }
  if (min_score !== undefined) {
    baseQuery += ' AND a.score >= ?';
    params.push(min_score);
  }
  if (max_score !== undefined) {
    baseQuery += ' AND a.score <= ?';
    params.push(max_score);
  }

  // Count query for pagination metadata
  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
  
  // Data query with pagination
  let dataQuery = `SELECT a.*, ct.name as template_name, ct.category, 
               l.name as location_name, l.store_number,
               u.name as user_name, u.email as user_email
               ${baseQuery} ORDER BY a.created_at DESC`;
  
  // Add pagination
  if (isSqlServer) {
    dataQuery += ` OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;
  } else {
    dataQuery += ` LIMIT ? OFFSET ?`;
  }

  // Get total count first
  dbInstance.get(countQuery, params, (countErr, countResult) => {
    if (countErr) {
      logger.error('Error counting audits:', countErr.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    // Add pagination params in the correct order for each DB
    const dataParams = isSqlServer 
      ? [...params, offset, limitNum]  // OFFSET, FETCH NEXT
      : [...params, limitNum, offset]; // LIMIT, OFFSET
    
    dbInstance.all(dataQuery, dataParams, (err, audits) => {
      if (err) {
        logger.error('Error fetching audits:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ 
        audits: audits || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    });
  });
});

// Get audit by scheduled_audit_id
router.get('/by-scheduled/:scheduledId', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const scheduledId = parseInt(req.params.scheduledId, 10);
  if (isNaN(scheduledId)) {
    return res.status(400).json({ error: 'Invalid scheduled audit ID' });
  }
  const isAdmin = isAdminUser(req.user);
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  const selectFields = `a.*, ct.name as template_name, ct.category, 
               l.name as location_name, l.store_number,
               u.name as user_name, u.email as user_email`;

  let query = `${isSqlServer ? 'SELECT TOP 1' : 'SELECT'} ${selectFields}
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN locations l ON a.location_id = l.id
               LEFT JOIN users u ON a.user_id = u.id
               WHERE a.scheduled_audit_id = ?`;
  
  let params = [scheduledId];
  
  // Regular users can only see their own audits
  if (!isAdmin) {
    query += ' AND a.user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY a.created_at DESC';
  if (!isSqlServer) {
    query += ' LIMIT 1';
  }

  dbInstance.get(query, params, (err, audit) => {
    if (err) {
      logger.error('Error fetching audit by scheduled_id:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    res.json({ audit });
  });
});

// Get single audit with items (admins can view any audit)
router.get('/:id', authenticate, (req, res) => {
  try {
    const dbInstance = db.getDb();
    const auditId = parseInt(req.params.id, 10);
    if (isNaN(auditId)) {
      return res.status(400).json({ error: 'Invalid audit ID' });
    }
    const userId = req.user.id;
    const isAdmin = isAdminUser(req.user);

    // Build absolute URL for uploaded evidence so web/mobile can display it reliably.
    // IMPORTANT: APP_URL is the frontend URL, but uploads are served by the backend.
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = forwardedProto ? String(forwardedProto).split(',')[0].trim() : req.protocol;
    const host = req.get('host');
    const backendBaseUrl = (process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || (protocol && host ? `${protocol}://${host}` : '')).replace(/\/$/, '');

    // Admins can view any audit, regular users only their own
    const whereClause = isAdmin ? 'WHERE a.id = ?' : 'WHERE a.id = ? AND a.user_id = ?';
    const queryParams = isAdmin ? [auditId] : [auditId, userId];

    dbInstance.get(
      `SELECT a.*, ct.name as template_name, ct.category, u.name as user_name, u.email as user_email
       FROM audits a
       JOIN checklist_templates ct ON a.template_id = ct.id
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}`,
      queryParams,
      (err, audit) => {
        if (err) {
          logger.error('Error fetching audit:', { error: err.message, stack: err.stack, auditId, userId, isAdmin });
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      // IMPORTANT: When viewing audit detail/report, show ALL template items regardless of audit_category.
      // The audit_category is only used during editing/score calculation to scope the work.
      // For the final report, users should see all categories and their status.
      // Use LEFT JOIN to include template items that don't have audit_items yet (for category-wise audits).
      const itemsQuery = `SELECT 
              ci.id as item_id,
              ci.title, 
              ci.description, 
              ci.category, 
              ci.required,
              COALESCE(ci.weight, 1) as weight, 
              COALESCE(ci.is_critical, 0) as is_critical,
              ai.id as audit_item_id,
              ai.mark,
              ai.comment,
              ai.status,
              ai.photo_url,
              ai.selected_option_id,
              cio.option_text as selected_option_text, 
              cio.mark as selected_mark
       FROM checklist_items ci
       LEFT JOIN audit_items ai ON ci.id = ai.item_id AND ai.audit_id = ?
       LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
       WHERE ci.template_id = ?
       ORDER BY ci.order_index, ci.id`;
      const itemsParams = [auditId, audit.template_id];

      dbInstance.all(
        itemsQuery,
        itemsParams,
        (err, items) => {
          if (err) {
            logger.error('Error fetching audit items:', { error: err.message, stack: err.stack, auditId, templateId: audit?.template_id });
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          
          // Extract time tracking data from ai.* if columns exist
          // SQLite/SQL Server will include all columns in ai.*, so we can access them directly
          
          // Normalize items: items without audit_items will have null values for audit_item fields
          // Construct full photo URLs if they exist
          const itemsNormalized = items.map(item => {
            const normalized = {
              item_id: item.item_id,
              title: item.title,
              description: item.description,
              category: item.category,
              required: item.required,
              weight: item.weight,
              is_critical: item.is_critical,
              // Audit item fields (may be null if no audit_item exists)
              audit_item_id: item.audit_item_id,
              mark: item.mark || null,
              comment: item.comment || null,
              status: item.status || 'pending',
              photo_url: item.photo_url || null,
              selected_option_id: item.selected_option_id || null,
              selected_option_text: item.selected_option_text || null,
              selected_mark: item.selected_mark || null,
              time_taken_minutes: null // Column doesn't exist in audit_items table
            };
            
            // Construct full photo URL if it exists and is not already a full URL
            // Check if it's already a full URL (starts with http/https) or contains a domain
            if (normalized.photo_url) {
              const raw = String(normalized.photo_url);
              const isFullUrl = raw.startsWith('http://') || raw.startsWith('https://');
              const hasDomain = raw.includes('://') || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(raw);
              
              if (!isFullUrl && !hasDomain) {
                // Only prepend backendBaseUrl if it's a relative path
                const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
                normalized.photo_url = backendBaseUrl ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
              } else if (hasDomain && !isFullUrl) {
                // If it has a domain but no protocol, add https://
                normalized.photo_url = `https://${raw.replace(/^https?:\/\//, '')}`;
              }
              // If it's already a full URL (starts with http/https), leave it as is
            }
            
            return normalized;
          });
          
          // Calculate time statistics (handle missing columns gracefully)
          const timeStats = {
            totalTime: 0,
            averageTime: 0,
            itemsWithTime: 0,
            totalItems: itemsNormalized.length
          };
          
          if (itemsNormalized.length > 0) {
            const itemsWithTime = itemsNormalized.filter(item => 
              item.time_taken_minutes !== null && 
              item.time_taken_minutes !== undefined && 
              item.time_taken_minutes !== ''
            );
            if (itemsWithTime.length > 0) {
              timeStats.itemsWithTime = itemsWithTime.length;
              timeStats.totalTime = itemsWithTime.reduce((sum, item) => sum + (parseFloat(item.time_taken_minutes) || 0), 0);
              timeStats.averageTime = Math.round((timeStats.totalTime / itemsWithTime.length) * 100) / 100; // Round to 2 decimals
            }
          }
          
          // Fetch options for ALL template items (not just those with audit_items)
          const itemIds = itemsNormalized.map(item => item.item_id);
          if (itemIds.length === 0) {
            return res.json({ audit, items: [], categoryScores: {}, timeStats });
          }
          
          const placeholders = itemIds.map(() => '?').join(',');
          
          dbInstance.all(
            `SELECT * FROM checklist_item_options WHERE item_id IN (${placeholders}) ORDER BY item_id, order_index, id`,
            itemIds,
            (err, options) => {
              if (err) {
                logger.error('Error fetching checklist item options:', { error: err.message, stack: err.stack, itemIds: itemIds.slice(0, 10) });
                return res.status(500).json({ error: 'Database error', details: err.message });
              }
              
              // Group options by item_id
              const optionsByItem = {};
              options.forEach(option => {
                if (!optionsByItem[option.item_id]) {
                  optionsByItem[option.item_id] = [];
                }
                optionsByItem[option.item_id].push(option);
              });
              
              // Calculate category-wise scores
              const categoryScores = {};
              itemsNormalized.forEach(item => {
                const category = item.category || 'Uncategorized';
                if (!categoryScores[category]) {
                  categoryScores[category] = {
                    totalItems: 0,
                    completedItems: 0,
                    totalPossibleScore: 0,
                    actualScore: 0,
                    weightedPossible: 0,
                    weightedActual: 0,
                    hasCriticalFailure: false
                  };
                }
                
                const catData = categoryScores[category];
                catData.totalItems++;
                
                // Get max score for this item (from "Yes" option or highest mark)
                const itemOptions = optionsByItem[item.item_id] || [];
                const yesOption = itemOptions.find(o => o.option_text === 'Yes' || o.option_text === 'Pass');
                let maxScore = 0;
                if (yesOption) {
                  maxScore = parseFloat(yesOption.mark) || 0;
                } else if (itemOptions.length > 0) {
                  const scores = itemOptions.map(o => parseFloat(o.mark) || 0).filter(s => !isNaN(s));
                  maxScore = scores.length > 0 ? Math.max(...scores) : 0;
                }
                
                const weight = parseInt(item.weight) || 1;
                catData.totalPossibleScore += maxScore;
                catData.weightedPossible += maxScore * weight;
                
                // Check if item is completed and calculate actual score
                if (item.mark !== null && item.mark !== undefined && item.mark !== '') {
                  catData.completedItems++;
                  if (item.mark !== 'NA') {
                    const mark = parseFloat(item.mark) || 0;
                    catData.actualScore += mark;
                    catData.weightedActual += mark * weight;
                    
                    // Check for critical failure
                    if (item.is_critical && mark === 0) {
                      catData.hasCriticalFailure = true;
                    }
                  }
                }
              });
              
              // Map categories to required categories (Quality, Speed, Cleanliness & Hygiene, Processes, HK)
              // Handle variations like "SERVICE (Speed of Service)", "SERVICE - Speed of Service", etc.
              const categoryMapping = {
                'Quality': 'Quality',
                'Speed': 'Speed',
                'Speed of Service': 'Speed',
                'SERVICE (Speed of Service)': 'Speed',
                'SERVICE - Speed of Service': 'Speed',
                'SERVICE – Speed of Service': 'Speed',
                'Cleanliness & Hygiene': 'Cleanliness & Hygiene',
                'Cleanliness': 'Cleanliness & Hygiene',
                'Hygiene': 'Cleanliness & Hygiene',
                'Processes': 'Processes',
                'HK': 'HK',
                'Housekeeping': 'HK'
              };
              
              // Also handle dynamic mapping for categories containing "Speed of Service" or "Speed"
              const normalizeCategory = (cat) => {
                if (!cat) return cat;
                const catLower = cat.toLowerCase();
                // Check if category contains speed-related keywords
                if (catLower.includes('speed of service') || (catLower.includes('speed') && !catLower.includes('speed of service - tracking'))) {
                  return 'Speed';
                }
                // Check for other mappings
                return categoryMapping[cat] || cat;
              };
              
              // Group categories by required categories
              const groupedCategoryScores = {};
              Object.keys(categoryScores).forEach(cat => {
                const mappedCat = normalizeCategory(cat);
                if (!groupedCategoryScores[mappedCat]) {
                  groupedCategoryScores[mappedCat] = {
                    totalItems: 0,
                    completedItems: 0,
                    totalPossibleScore: 0,
                    actualScore: 0,
                    weightedPossible: 0,
                    weightedActual: 0,
                    hasCriticalFailure: false
                  };
                }
                const grouped = groupedCategoryScores[mappedCat];
                const original = categoryScores[cat];
                grouped.totalItems += original.totalItems;
                grouped.completedItems += original.completedItems;
                grouped.totalPossibleScore += original.totalPossibleScore;
                grouped.actualScore += original.actualScore;
                grouped.weightedPossible += original.weightedPossible;
                grouped.weightedActual += original.weightedActual;
                if (original.hasCriticalFailure) {
                  grouped.hasCriticalFailure = true;
                }
              });
              
              // Calculate percentage scores for each grouped category
              Object.keys(groupedCategoryScores).forEach(category => {
                const cat = groupedCategoryScores[category];
                cat.score = cat.totalPossibleScore > 0 
                  ? Math.round((cat.actualScore / cat.totalPossibleScore) * 100) 
                  : 0;
                cat.weightedScore = cat.weightedPossible > 0 
                  ? Math.round((cat.weightedActual / cat.weightedPossible) * 100) 
                  : 0;
              });
              
              // Attach options to items
              const itemsWithOptions = itemsNormalized.map(item => ({
                ...item,
                options: (optionsByItem[item.item_id] || []).map(option => ({
                  ...option,
                  text: option.option_text // Add text field for mobile compatibility
                }))
              }));
              
              res.json({ audit, items: itemsWithOptions, categoryScores: groupedCategoryScores, timeStats });
            }
          );
        }
      );
    }
  );
  } catch (error) {
    logger.error('Unhandled error in GET /api/audits/:id:', { error: error.message, stack: error.stack, auditId: req.params.id });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create new audit
router.post('/', authenticate, (req, res) => {
  const { 
    template_id, restaurant_name, location, location_id, team_id, notes, scheduled_audit_id,
    // Optional: category-wise audit scope (checklist_items.category)
    audit_category,
    // GPS location data
    gps_latitude, gps_longitude, gps_accuracy, gps_timestamp, location_verified
  } = req.body;
  const dbInstance = db.getDb();
  const { requirePermission, getUserPermissions, hasPermission } = require('../middleware/permissions');

  if (!template_id || !restaurant_name) {
    return res.status(400).json({ error: 'Template ID and restaurant name are required' });
  }

  // Geo-fencing validation: Check if GPS location is within allowed distance from store
  // This must be done synchronously before proceeding
  if (gps_latitude && gps_longitude && location_id) {
    return dbInstance.get('SELECT latitude, longitude FROM locations WHERE id = ?', [location_id], (err, storeLocation) => {
      if (!err && storeLocation && storeLocation.latitude && storeLocation.longitude) {
        // Calculate distance using Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (parseFloat(storeLocation.latitude) * Math.PI) / 180;
        const φ2 = (parseFloat(gps_latitude) * Math.PI) / 180;
        const Δφ = ((parseFloat(gps_latitude) - parseFloat(storeLocation.latitude)) * Math.PI) / 180;
        const Δλ = ((parseFloat(gps_longitude) - parseFloat(storeLocation.longitude)) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in meters

        const MAX_ALLOWED_DISTANCE = 1000; // 1000 meters = 1 km

        if (distance > MAX_ALLOWED_DISTANCE) {
          return res.status(400).json({ 
            error: 'Location too far from store',
            message: `You are ${Math.round(distance)}m from the store location. Audits must be conducted within ${MAX_ALLOWED_DISTANCE}m.`,
            distance: Math.round(distance),
            maxDistance: MAX_ALLOWED_DISTANCE
          });
        }
      }
      // Continue with audit creation if validation passes
      proceedWithAuditCreation();
    });
  }
  
  // If no GPS validation needed, proceed directly
  proceedWithAuditCreation();
  
  function proceedWithAuditCreation() {

  // If creating audit from scheduled audit, check permission
  const validateScheduledAudit = (callback) => {
    if (!scheduled_audit_id) {
      return callback(null, null);
    }
    
    // Check if user has permission to start scheduled audits
    getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
      if (permErr) {
        logger.error('Error fetching permissions:', permErr.message);
        return callback({ status: 500, message: 'Error checking permissions' });
      }

      // Check if user has permission to start scheduled audits
      const canStartScheduledAudit = hasPermission(userPermissions, 'start_scheduled_audits') || 
                                      hasPermission(userPermissions, 'manage_scheduled_audits') ||
                                      isAdminUser(req.user);

      if (!canStartScheduledAudit) {
        return callback({ status: 403, message: 'You do not have permission to start scheduled audits' });
      }

      dbInstance.get(
        `SELECT * FROM scheduled_audits WHERE id = ? AND (created_by = ? OR assigned_to = ?)`,
        [scheduled_audit_id, req.user.id, req.user.id],
        (err, schedule) => {
          if (err) {
            return callback({ status: 500, message: 'Database error validating scheduled audit' });
          }
          if (!schedule) {
            return callback({ status: 403, message: 'Scheduled audit not found or not assigned to you' });
          }
          if (schedule.status === 'completed') {
            return callback({ status: 400, message: 'Scheduled audit is already completed' });
          }
          
          // Validate that scheduled audit can only be opened on or after the scheduled date
          // This allows pre-poning (rescheduling to earlier date) and opening on scheduled date
          if (schedule.scheduled_date) {
            const scheduledDate = new Date(schedule.scheduled_date);
            scheduledDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Requirement: "Audit template should open on the same day of audit and not other days"
            // Only allow opening on the exact scheduled date (same day), not before or after
            if (scheduledDate.getTime() !== today.getTime()) {
              // Check if it was rescheduled to today
              dbInstance.get(
                `SELECT new_date FROM reschedule_tracking 
                 WHERE scheduled_audit_id = ? 
                 ORDER BY created_at DESC LIMIT 1`,
                [schedule.id],
                (rescheduleErr, reschedule) => {
                  if (!rescheduleErr && reschedule && reschedule.new_date) {
                    const rescheduledDate = new Date(reschedule.new_date);
                    rescheduledDate.setHours(0, 0, 0, 0);
                    if (rescheduledDate.getTime() <= today.getTime()) {
                      // Was rescheduled to today or earlier, allow opening
                      return callback(null, schedule);
                    }
                  }
                  // Not rescheduled to today, prevent opening
                  const scheduledDateStr = scheduledDate.toLocaleDateString();
                  return callback({ 
                    status: 400, 
                    message: `This audit is scheduled for ${scheduledDateStr}. Please open it on the scheduled date or reschedule it first.` 
                  });
                }
              );
              return; // Exit early, callback will be called above
            }
            // Scheduled date is today, allow opening
          }
          
          callback(null, schedule);
        }
      );
    });
  };

  validateScheduledAudit((scheduleErr, linkedSchedule) => {
    if (scheduleErr) {
      return res.status(scheduleErr.status).json({ error: scheduleErr.message });
    }

    // Check checklist-specific permissions if not from scheduled audit
    const checkChecklistPermission = (callback) => {
      if (linkedSchedule) {
        // Scheduled audits bypass checklist permission check (they have their own permission)
        return callback(null);
      }

      // Check if user has permission to use this specific checklist
      getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
        if (permErr) {
          logger.error('Error fetching permissions:', permErr.message);
          return callback({ status: 500, message: 'Error checking permissions' });
        }

        // Check for checklist-specific permission
        dbInstance.get(
          `SELECT can_start_audit FROM user_checklist_permissions WHERE user_id = ? AND template_id = ?`,
          [req.user.id, template_id],
          (err, permission) => {
            if (err) {
              logger.error('Error checking checklist permission:', err);
              // If table doesn't exist or error, allow access (backward compatible)
              return callback(null);
            }

            // If permission record exists and can_start_audit is false, deny access
            if (permission && permission.can_start_audit === 0) {
              return callback({ status: 403, message: 'You do not have permission to start audits with this checklist' });
            }

            // If no specific permission record, check general template permissions
            const canUseTemplate = isAdminUser(req.user) ||
              hasPermission(userPermissions, 'display_templates') ||
              hasPermission(userPermissions, 'view_templates') ||
              hasPermission(userPermissions, 'manage_templates');

            if (!canUseTemplate) {
              return callback({ status: 403, message: 'You do not have permission to use this checklist' });
            }

            callback(null);
          }
        );
      });
    };

    checkChecklistPermission((permErr) => {
      if (permErr) {
        return res.status(permErr.status).json({ error: permErr.message });
      }

      // Get template and items
      dbInstance.get('SELECT * FROM checklist_templates WHERE id = ?', [template_id], (err, template) => {
        if (err || !template) {
          return res.status(404).json({ error: 'Template not found' });
        }

      const normalizedAuditCategory = (typeof audit_category === 'string' && audit_category.trim())
        ? audit_category.trim()
        : null;

      // If audit_category is provided, scope the audit to that category only.
      const itemsQuery = normalizedAuditCategory
        ? 'SELECT * FROM checklist_items WHERE template_id = ? AND category = ? ORDER BY order_index, id'
        : 'SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index, id';

      const itemsParams = normalizedAuditCategory ? [template_id, normalizedAuditCategory] : [template_id];

      dbInstance.all(itemsQuery, 
        itemsParams, (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const totalItems = items.length;
          if (normalizedAuditCategory && totalItems === 0) {
            return res.status(400).json({ error: `No checklist items found for category: ${normalizedAuditCategory}` });
          }

      const infoValidation = validateInfoStepNotes(notes);
      if (infoValidation) {
        return res.status(400).json(infoValidation);
      }

      // Create audit - use location_id if provided, otherwise use location text
          // Store original_scheduled_date for Schedule Adherence tracking
          const originalScheduledDate = linkedSchedule ? linkedSchedule.scheduled_date : null;
          
          // Build INSERT query dynamically to handle optional columns
          const insertColumns = ['template_id', 'user_id', 'restaurant_name', 'location', 'location_id', 'team_id', 'notes', 'total_items', 'scheduled_audit_id', 'gps_latitude', 'gps_longitude', 'gps_accuracy', 'gps_timestamp', 'location_verified'];
          const insertValues = [template_id, req.user.id, restaurant_name, location || '', location_id || null, team_id || null, notes || '', totalItems, linkedSchedule ? linkedSchedule.id : null, gps_latitude || null, gps_longitude || null, gps_accuracy || null, gps_timestamp || null, location_verified ? 1 : 0];
          
          // Try to include original_scheduled_date if the column exists
          if (originalScheduledDate) {
            insertColumns.push('original_scheduled_date');
            insertValues.push(originalScheduledDate);
          }

          // Include audit_category if provided (category-wise audits)
          if (normalizedAuditCategory) {
            insertColumns.push('audit_category');
            insertValues.push(normalizedAuditCategory);
          }
          
          const placeholders = insertColumns.map(() => '?').join(', ');
          
          dbInstance.run(
            `INSERT INTO audits (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            insertValues,
            function(err, result) {
              if (err) {
                // If error is about missing column, retry without optional columns
                if (err.message && (err.message.includes('no such column') || err.message.includes('Invalid column name'))) {
                  logger.warn('Some columns may not exist, retrying with basic columns only');
                  const basicColumns = ['template_id', 'user_id', 'restaurant_name', 'location', 'location_id', 'team_id', 'notes', 'total_items', 'scheduled_audit_id'];
                  const basicValues = [template_id, req.user.id, restaurant_name, location || '', location_id || null, team_id || null, notes || '', totalItems, linkedSchedule ? linkedSchedule.id : null];
                  
                  // IMPORTANT: Do NOT include audit_category in this retry insert.
                  // If we are here, the DB likely doesn't have one of the optional columns (e.g. original_scheduled_date / audit_category).
                  const basicPlaceholders = basicColumns.map(() => '?').join(', ');
                  
                  dbInstance.run(
                    `INSERT INTO audits (${basicColumns.join(', ')}) VALUES (${basicPlaceholders})`,
                    basicValues,
                    function(retryErr, retryResult) {
                      if (retryErr) {
                        logger.error('Error creating audit (retry):', retryErr);
                        return res.status(500).json({ error: 'Error creating audit', details: retryErr.message });
                      }
                      // Continue with audit items creation
                      const auditId = (retryResult && retryResult.lastID) ? retryResult.lastID : (this.lastID || 0);
                      if (!auditId || auditId === 0) {
                        logger.error('Failed to get audit ID after insert (retry)');
                        return res.status(500).json({ error: 'Failed to create audit - no ID returned' });
                      }
                      createAuditItems(auditId, items, linkedSchedule);
                    }
                  );
                  return;
                }
                logger.error('Error creating audit:', err);
                return res.status(500).json({ error: 'Error creating audit', details: err.message });
              }

              // Handle both SQL Server (result.lastID) and SQLite (this.lastID)
              const auditId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
              
              if (!auditId || auditId === 0) {
                logger.error('Failed to get audit ID after insert');
                return res.status(500).json({ error: 'Failed to create audit - no ID returned' });
              }

              createAuditItems(auditId, items, linkedSchedule);
            }
          );
          
          // Helper function to create audit items
          function createAuditItems(auditId, items, linkedSchedule) {
              // Don't mark as in_progress here - wait until user actually starts working on items
              // This prevents status from changing automatically when audit is just created

              // Create audit items
              if (items.length > 0) {
                // Use individual run calls for cross-database compatibility
                let completed = 0;
                let hasError = false;

                items.forEach((item) => {
                  dbInstance.run(
                    'INSERT INTO audit_items (audit_id, item_id, status) VALUES (?, ?, ?)',
                    [auditId, item.id, 'pending'],
                    function(err) {
                      if (hasError) return; // Skip if error already occurred
                      
                      if (err) {
                        hasError = true;
                        logger.error('Error creating audit item:', err.message);
                        return res.status(500).json({ error: 'Error creating audit items' });
                      }

                      completed++;
                      // When all items are created, send success response
                      if (completed === items.length) {
                        res.status(201).json({ id: auditId, message: 'Audit created successfully' });
                      }
                    }
                  );
                });
              } else {
                res.status(201).json({ id: auditId, message: 'Audit created successfully' });
              }
          }
        }
      );
      });
    });
  });
  } // Close proceedWithAuditCreation function
}); // Close router.post handler

// Update audit details
router.put('/:id', authenticate, (req, res) => {
  const auditId = parseInt(req.params.id, 10);
  if (isNaN(auditId)) {
    return res.status(400).json({ error: 'Invalid audit ID' });
  }
  const { 
    restaurant_name, 
    location, 
    location_id, 
    notes,
    // GPS location data
    gps_latitude, 
    gps_longitude, 
    gps_accuracy, 
    gps_timestamp, 
    location_verified
  } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { getUserPermissions, hasPermission } = require('../middleware/permissions');
  const isAdmin = isAdminUser(req.user);

  // First, check if audit exists and belongs to user (or admin can access any)
  const whereClause = isAdmin ? 'id = ?' : 'id = ? AND user_id = ?';
  const queryParams = isAdmin ? [auditId] : [auditId, userId];
  
  dbInstance.get(`SELECT * FROM audits WHERE ${whereClause}`, queryParams, (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    // Users can always update their own audits, but check permissions for others
    const isOwnAudit = audit.user_id === userId;
    
    // If not own audit and not admin, check permissions
    if (!isOwnAudit && !isAdmin) {
      getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
        if (permErr) {
          logger.error('Error fetching permissions:', permErr.message);
          return res.status(500).json({ error: 'Error checking permissions' });
        }

        const canUpdate = hasPermission(userPermissions, 'update_audits') ||
                         hasPermission(userPermissions, 'manage_audits');

        if (!canUpdate) {
          return res.status(403).json({ error: 'You do not have permission to update this audit' });
        }
        proceedWithUpdate();
      });
    } else {
      // Own audit or admin - proceed directly
      proceedWithUpdate();
    }

    function proceedWithUpdate() {
      // Prevent changes to completed audits (admins can still update for corrections)
      if (audit.status === 'completed' && !isAdmin) {
        return res.status(403).json({ error: 'Cannot modify a completed audit' });
      }

    // Update audit
    const updateFields = [];
    const updateValues = [];

    if (restaurant_name !== undefined) {
      updateFields.push('restaurant_name = ?');
      updateValues.push(restaurant_name);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (location_id !== undefined) {
      updateFields.push('location_id = ?');
      updateValues.push(location_id);
    }
    if (notes !== undefined) {
      const infoValidation = validateInfoStepNotes(notes);
      if (infoValidation) {
        return res.status(400).json(infoValidation);
      }
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    // GPS location fields
    if (gps_latitude !== undefined) {
      updateFields.push('gps_latitude = ?');
      updateValues.push(gps_latitude);
    }
    if (gps_longitude !== undefined) {
      updateFields.push('gps_longitude = ?');
      updateValues.push(gps_longitude);
    }
    if (gps_accuracy !== undefined) {
      updateFields.push('gps_accuracy = ?');
      updateValues.push(gps_accuracy);
    }
    if (gps_timestamp !== undefined) {
      updateFields.push('gps_timestamp = ?');
      updateValues.push(gps_timestamp);
    }
    if (location_verified !== undefined) {
      updateFields.push('location_verified = ?');
      updateValues.push(location_verified ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    updateValues.push(auditId);

      dbInstance.run(
        `UPDATE audits SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues,
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating audit' });
          }
          res.json({ message: 'Audit updated successfully' });
        }
      );
    }
  });
});

// Update audit item (single item)
// NOTE: This must come AFTER the batch route, or we need to skip 'batch' as itemId
router.put('/:auditId/items/:itemId', authenticate, (req, res, next) => {
  // Skip if this is actually a batch request (route order issue workaround)
  if (req.params.itemId === 'batch') {
    return next();
  }
  
  // Convert params to integers to prevent MSSQL type conversion issues
  const auditId = parseInt(req.params.auditId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  
  // Validate params are valid numbers
  if (isNaN(auditId) || isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid audit ID or item ID' });
  }
  
  const { status, comment, photo_url, selected_option_id, mark, time_taken_minutes, started_at } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  // Verify audit belongs to user (or admin can access any)
  const whereClause = isAdmin ? 'id = ?' : 'id = ? AND user_id = ?';
  const queryParams = isAdmin ? [auditId] : [auditId, userId];
  
  dbInstance.get(`SELECT * FROM audits WHERE ${whereClause}`, queryParams, (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    // Prevent changes to completed audits (admins can still update for corrections)
    if (audit.status === 'completed' && !isAdmin) {
      return res.status(403).json({ error: 'Cannot modify items in a completed audit' });
    }

    // If selected_option_id is provided, validate it exists and get the mark from the option
    let finalMark = mark;
    let validSelectedOptionId = selected_option_id || null;
    
    if (selected_option_id) {
      dbInstance.get('SELECT mark FROM checklist_item_options WHERE id = ?', [selected_option_id], (err, option) => {
        if (err || !option) {
          // Option doesn't exist or error occurred - set to null to avoid foreign key violation
          logger.debug(`Selected option ${selected_option_id} not found, setting to null`);
          validSelectedOptionId = null;
        } else {
          finalMark = option.mark;
        }
        updateAuditItem();
      });
    } else {
      updateAuditItem();
    }

    function updateAuditItem() {
      const isFilledValue = (value) =>
        value !== undefined && value !== null && String(value).trim() !== '';

      const isItemComplete = (payload, meta) => {
        const inputType = String(meta?.input_type || '').toLowerCase();
        const statusValue = payload.status;
        const hasStatus = statusValue && statusValue !== 'pending';
        const hasOption = payload.selected_option_id !== undefined && payload.selected_option_id !== null;
        const hasPhoto = isFilledValue(payload.photo_url);
        const hasComment = isFilledValue(payload.comment);
        const hasMarkValue = isFilledValue(payload.mark) && String(payload.mark).toUpperCase() !== 'NA';

        if (inputType === 'option_select' || inputType === 'select_from_data_source') return !!hasOption;
        if (inputType === 'image_upload') return !!hasPhoto;
        if (['open_ended', 'description', 'number', 'date', 'scan_code', 'signature'].includes(inputType)) {
          return hasComment || hasMarkValue;
        }
        return !!hasStatus;
      };

      const payloadForValidation = {
        status,
        comment,
        photo_url,
        selected_option_id: validSelectedOptionId,
        mark: finalMark
      };

      dbInstance.get(
        'SELECT input_type, required FROM checklist_items WHERE id = ?',
        [itemId],
        (metaErr, meta) => {
          if (metaErr) {
            logger.error('Error loading checklist item meta for validation:', metaErr.message);
            return res.status(500).json({ error: 'Database error validating item' });
          }
          const isRequired = meta && (meta.required === 1 || meta.required === true);
          if (isRequired && !isItemComplete(payloadForValidation, meta)) {
            return res.status(400).json({
              error: 'Required checklist item is incomplete',
              itemId,
              input_type: meta?.input_type || null
            });
          }

      // First check if audit has scheduled_audit_id and mark as in_progress if needed
      dbInstance.get(
        'SELECT scheduled_audit_id FROM audits WHERE id = ?',
        [auditId],
        (auditErr, audit) => {
          if (!auditErr && audit && audit.scheduled_audit_id) {
            // Check if scheduled audit is still pending and mark as in_progress
            dbInstance.get(
              'SELECT status FROM scheduled_audits WHERE id = ?',
              [audit.scheduled_audit_id],
              (scheduleErr, schedule) => {
                if (!scheduleErr && schedule && 
                    schedule.status !== 'in_progress' && 
                    schedule.status !== 'completed') {
                  // Mark scheduled audit as in_progress when user first starts working
                  markScheduledAuditInProgress(dbInstance, audit.scheduled_audit_id);
                }
                continueWithItemUpdate();
              }
            );
          } else {
            continueWithItemUpdate();
          }
        }
      );
        }
      );
      
      function continueWithItemUpdate() {
        // Check if audit item exists
        dbInstance.get(
          'SELECT id FROM audit_items WHERE audit_id = ? AND item_id = ?',
          [auditId, itemId],
          (err, existingItem) => {
            if (err) {
              logger.error('Error checking for existing audit item:', err.message);
              return res.status(500).json({ error: 'Database error checking existing item' });
            }

            // If item doesn't exist, create it first
            if (!existingItem) {
              // IMPORTANT: If an option is selected, automatically set status to 'completed'
              // This ensures items are marked as completed when an option is chosen
              let itemStatus = status || 'pending';
              if (validSelectedOptionId && finalMark && itemStatus === 'pending') {
                itemStatus = 'completed';
                logger.debug(`[Create Item] Auto-setting status to 'completed' for new item ${itemId} with selected_option_id ${validSelectedOptionId}`);
              }
              
              const insertFields = ['audit_id', 'item_id', 'status'];
              const insertValues = [auditId, itemId, itemStatus];
              const insertPlaceholders = ['?', '?', '?'];
              
              // Always include comment, photo_url, selected_option_id, and mark fields (can be null)
              insertFields.push('comment', 'photo_url', 'selected_option_id', 'mark');
              insertValues.push(comment || null, photo_url || null, validSelectedOptionId, finalMark || null);
              insertPlaceholders.push('?', '?', '?', '?');
              
              // Add time tracking fields if provided
              if (time_taken_minutes !== undefined) {
                insertFields.push('time_taken_minutes');
                insertValues.push(time_taken_minutes || null);
                insertPlaceholders.push('?');
              }
              if (started_at !== undefined) {
                insertFields.push('started_at');
                insertValues.push(started_at || null);
                insertPlaceholders.push('?');
              }
              
              dbInstance.run(
                `INSERT INTO audit_items (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`,
                insertValues,
                function(insertErr) {
                  if (insertErr) {
                    logger.error('Error creating audit item:', insertErr.message);
                    return res.status(500).json({ error: 'Error creating audit item: ' + insertErr.message });
                  }
                  // After creating, continue with score calculation
                  calculateScoreAndUpdate();
                }
              );
            } else {
              // Update existing audit item
              // IMPORTANT: If an option is selected but status is 'pending', automatically set to 'completed'
              // This ensures items are marked as completed when an option is chosen
              let finalStatus = status || 'pending';
              if (validSelectedOptionId && finalMark && finalStatus === 'pending') {
                finalStatus = 'completed';
                logger.debug(`[Update Item] Auto-setting status to 'completed' for item ${itemId} with selected_option_id ${validSelectedOptionId}`);
              }
              
              const updateFields = ['status = ?', 'comment = ?', 'photo_url = ?'];
              const updateValues = [finalStatus, comment || null, photo_url || null];
              
              if (selected_option_id !== undefined) {
                updateFields.push('selected_option_id = ?');
                updateValues.push(validSelectedOptionId);
              }
              
              if (finalMark !== undefined) {
                updateFields.push('mark = ?');
                updateValues.push(finalMark || null);
              }
              
              // Add time tracking fields if provided
              if (time_taken_minutes !== undefined) {
                updateFields.push('time_taken_minutes = ?');
                updateValues.push(time_taken_minutes || null);
              }
              if (started_at !== undefined) {
                updateFields.push('started_at = ?');
                updateValues.push(started_at || null);
              }
              
              // Only update completed_at if status is completed
              if (finalStatus === 'completed') {
                updateFields.push('completed_at = CURRENT_TIMESTAMP');
                // If time_taken_minutes not provided but started_at exists, calculate it
                if (time_taken_minutes === undefined && started_at) {
                  updateFields.push('time_taken_minutes = ROUND((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 1440, 2)');
                }
              }
              
              updateValues.push(auditId, itemId);
              
              dbInstance.run(
                `UPDATE audit_items 
                 SET ${updateFields.join(', ')}
                 WHERE audit_id = ? AND item_id = ?`,
                updateValues,
                function(updateErr) {
                  if (updateErr) {
                    logger.error('Error updating audit item:', updateErr.message);
                    return res.status(500).json({ error: 'Error updating audit item: ' + updateErr.message });
                  }
                  // After updating, continue with score calculation
                  calculateScoreAndUpdate();
                }
              );
            }
          }
        );
      }

      function calculateScoreAndUpdate() {
        // Update audit progress - calculate score based on marks with weighted scoring support
        // Get audit items with their checklist item details including weight and critical flag
        dbInstance.all(
          `SELECT ai.item_id, ai.mark, ci.id as checklist_item_id, 
                  COALESCE(ci.weight, 1) as weight, COALESCE(ci.is_critical, 0) as is_critical
           FROM audit_items ai
           JOIN checklist_items ci ON ai.item_id = ci.id
           WHERE ai.audit_id = ?`,
          [auditId],
          (err, auditItems) => {
            if (err) {
              logger.error('Error fetching audit items:', err.message);
              return res.json({ message: 'Audit item updated successfully' });
            }

            // Get total possible score from template (sum of "Yes" option marks, excluding N/A items)
            dbInstance.get('SELECT template_id, audit_category FROM audits WHERE id = ?', [auditId], (err, audit) => {
              if (err || !audit) {
                logger.error('Error fetching audit:', err.message);
                return res.json({ message: 'Audit item updated successfully' });
              }

              // Get all checklist items for this template with their MAX score from options, weight, and critical flag
              // Use MAX numeric score (excluding NA) to support all scoring presets, not just Yes/No/NA
              const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
              let query;
              if (dbType === 'mssql' || dbType === 'sqlserver') {
                query = `SELECT ci.id, COALESCE(ci.weight, 1) as weight, COALESCE(ci.is_critical, 0) as is_critical,
                         (SELECT MAX(CASE WHEN ISNUMERIC(cio.mark) = 1 THEN CAST(cio.mark AS FLOAT) ELSE NULL END)
                          FROM checklist_item_options cio 
                          WHERE cio.item_id = ci.id) as max_score
                         FROM checklist_items ci
                         WHERE ci.template_id = ?`;
              } else {
                query = `SELECT ci.id, COALESCE(ci.weight, 1) as weight, COALESCE(ci.is_critical, 0) as is_critical,
                         (SELECT MAX(CASE WHEN cio.mark NOT LIKE '%NA%' AND cio.mark GLOB '[0-9]*' THEN CAST(cio.mark AS REAL) ELSE NULL END)
                          FROM checklist_item_options cio 
                          WHERE cio.item_id = ci.id) as max_score
                         FROM checklist_items ci
                         WHERE ci.template_id = ?`;
              }
              
              // IMPORTANT: For completion status, always check ALL template items, not just the selected category.
              // The audit_category is only used for scoping the work during editing, but completion should
              // consider all items in the template to ensure the audit is truly complete.
              const templateParams = [audit.template_id];
              // Remove category filter for completion check
              const templateQuery = query;

              dbInstance.all(
                templateQuery,
                templateParams,
                (err, templateItems) => {
                  if (err) {
                    logger.error('Error fetching template items:', err.message);
                    return calculateScoreFallback();
                  }

                  // Build lookup map for template items
                  const templateItemMap = {};
                  templateItems.forEach(item => {
                    templateItemMap[item.id] = item;
                  });

                  // Calculate weighted total possible score
                  let totalPossibleScore = 0;
                  let weightedTotalPossible = 0;
                  templateItems.forEach(item => {
                    if (item.max_score !== null) {
                      const maxScore = parseFloat(item.max_score) || 0;
                      const weight = parseInt(item.weight) || 1;
                      totalPossibleScore += maxScore;
                      weightedTotalPossible += maxScore * weight;
                    }
                  });

                  // Calculate actual scores (weighted and unweighted) and check for critical failures
                  let actualScore = 0;
                  let weightedActualScore = 0;
                  let hasCriticalFailure = false;
                  
                  auditItems.forEach(item => {
                    if (item.mark && item.mark !== 'NA') {
                      const mark = parseFloat(item.mark) || 0;
                      const weight = parseInt(item.weight) || 1;
                      actualScore += mark;
                      weightedActualScore += mark * weight;
                      
                      // Check for critical item failure (mark is 0 or very low on critical item)
                      if (item.is_critical && mark === 0) {
                        hasCriticalFailure = true;
                      }
                    }
                  });

                  // Calculate regular percentage score (capped at 100%)
                  const score = totalPossibleScore > 0 
                    ? Math.min(100, Math.round((actualScore / totalPossibleScore) * 100))
                    : 0;
                    
                  // Calculate weighted percentage score (capped at 100%)
                  const weightedScore = weightedTotalPossible > 0 
                    ? Math.min(100, Math.round((weightedActualScore / weightedTotalPossible) * 100))
                    : 0;

                  // Compare against ALL template items, not just audit items created
                  // This ensures completion is based on all items in the template, including those not yet started
                  const total = templateItems.length;
                  
                  // Create a map of audit items by item_id for quick lookup
                  const auditItemMap = {};
                  auditItems.forEach(item => {
                    auditItemMap[item.item_id] = item;
                  });
                  
                  // Count how many template items have been completed
                  // An item is completed only if:
                  // 1. It exists in audit_items
                  // 2. It has a valid mark (not null, not empty, not undefined, or is 'NA')
                  // 3. The mark is a meaningful value (not just whitespace)
                  let completed = 0;
                  let missingItems = [];
                  
                  templateItems.forEach(templateItem => {
                    const auditItem = auditItemMap[templateItem.id];
                    if (!auditItem) {
                      // Item doesn't exist in audit_items yet - not completed
                      missingItems.push(templateItem.id);
                      return;
                    }
                    
                    // Check if item has a valid mark - be very strict
                    const markValue = auditItem.mark;
                    
                    // Check for null, undefined, or empty
                    if (markValue === null || markValue === undefined) {
                      missingItems.push(templateItem.id);
                      return;
                    }
                    
                    // Convert to string and trim
                    const markStr = String(markValue).trim();
                    
                    // Check if it's empty after trimming
                    if (markStr === '') {
                      missingItems.push(templateItem.id);
                      return;
                    }
                    
                    // Check if it's NA (case-insensitive)
                    const isNA = markStr.toUpperCase() === 'NA' || markStr.toUpperCase() === 'N/A';
                    
                    // If it's NA or has a non-empty value, it's completed
                    if (isNA || markStr.length > 0) {
                      completed++;
                    } else {
                      missingItems.push(templateItem.id);
                    }
                  });
                  
                  // Log for debugging if items are missing
                  if (missingItems.length > 0) {
                    logger.info(`[Audit ${auditId}] Completion check: ${completed}/${total} items completed. Missing marks for ${missingItems.length} items.`);
                    if (missingItems.length <= 10) {
                      logger.debug(`[Audit ${auditId}] Missing marks for items: ${missingItems.join(', ')}`);
                    }
                  }
                  
                  // Only mark as completed if ALL items have valid marks
                  const auditStatus = (completed === total && total > 0 && missingItems.length === 0) ? 'completed' : 'in_progress';
                  
                  // Force in_progress if any items are missing
                  if (missingItems.length > 0) {
                    logger.info(`[Audit ${auditId}] Forcing status to 'in_progress': ${missingItems.length} items missing marks out of ${total} total items`);
                  }

                  dbInstance.run(
                    `UPDATE audits 
                     SET completed_items = ?, score = ?, weighted_score = ?, has_critical_failure = ?, status = ?, 
                         completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
                     WHERE id = ?`,
                    [completed, score, weightedScore, hasCriticalFailure ? 1 : 0, auditStatus, completed, total, auditId],
                    function(updateErr) {
                      if (updateErr) {
                        logger.error('Error updating audit:', updateErr.message);
                      }
                      if (auditStatus === 'completed') {
                        handleScheduledAuditCompletion(dbInstance, auditId, 'completed');
                        // Auto-create action items for failed items
                        const { autoCreateActionItems } = require('../utils/autoActions');
                        autoCreateActionItems(dbInstance, auditId, { onlyCritical: false, defaultDueDays: 7 }, (err, actions) => {
                          if (err) {
                            logger.error('Error auto-creating action items:', err);
                          } else if (actions && actions.length > 0) {
                            logger.info(`[Auto-Actions] Created ${actions.length} action items for completed audit ${auditId}`);
                          }
                        });
                      }
                      res.json({ 
                        message: 'Audit item updated successfully',
                        score,
                        weightedScore,
                        hasCriticalFailure
                      });
                    }
                  );
                }
              );
            });
          }
        );
      }

      // Fallback calculation (old method)
      function calculateScoreFallback() {
        dbInstance.all(
          `SELECT COUNT(*) as total, 
           SUM(CASE WHEN mark IS NOT NULL AND mark != 'NA' THEN CAST(mark AS REAL) ELSE 0 END) as total_marks,
           SUM(CASE WHEN mark IS NOT NULL AND mark != 'NA' THEN 1 ELSE 0 END) as items_with_marks,
           MAX(CASE WHEN mark IS NOT NULL AND mark != 'NA' THEN CAST(mark AS REAL) ELSE 0 END) as max_mark
           FROM audit_items WHERE audit_id = ?`,
          [auditId],
          (err, result) => {
            if (!err && result.length > 0) {
              const total = result[0].total || 0;
              const totalMarks = result[0].total_marks || 0;
              const itemsWithMarks = result[0].items_with_marks || 0;
              const maxMark = result[0].max_mark || 2;
              
              const score = total > 0 && maxMark > 0 
                ? Math.round((totalMarks / (total * maxMark)) * 100) 
                : 0;
              
              // Get template items to check against ALL items in the audit scope (category-wise audits supported)
              dbInstance.get('SELECT template_id, audit_category FROM audits WHERE id = ?', [auditId], (templateErr, auditRow) => {
                if (templateErr || !auditRow) {
                  logger.error('Error fetching audit template for fallback:', templateErr);
                  return res.json({ message: 'Audit item updated successfully' });
                }
                
                // IMPORTANT: For completion status, always check ALL template items, not just the selected category.
                // The audit_category is only used for scoping the work during editing, but completion should
                // consider all items in the template to ensure the audit is truly complete.
                const templateItemsQuery = 'SELECT id FROM checklist_items WHERE template_id = ?';
                const templateItemsParams = [auditRow.template_id];

                dbInstance.all(
                  templateItemsQuery,
                  templateItemsParams,
                  (templateItemsErr, templateItems) => {
                    if (templateItemsErr || !templateItems) {
                      logger.error('Error fetching template items for fallback:', templateItemsErr);
                      return res.json({ message: 'Audit item updated successfully' });
                    }
                    
                    const templateTotal = templateItems.length;
                    
                    // Get all audit items with marks
                    dbInstance.all(
                      'SELECT item_id, mark FROM audit_items WHERE audit_id = ?',
                      [auditId],
                      (auditItemsErr, allAuditItems) => {
                        if (auditItemsErr) {
                          logger.error('Error fetching audit items for fallback:', auditItemsErr);
                          return res.json({ message: 'Audit item updated successfully' });
                        }
                        
                        // Create map of audit items
                        const auditItemMap = {};
                        allAuditItems.forEach(item => {
                          auditItemMap[item.item_id] = item;
                        });
                        
                        // Count completed using strict validation
                        let completed = 0;
                        let missingItems = [];
                        
                        templateItems.forEach(templateItem => {
                          const auditItem = auditItemMap[templateItem.id];
                          if (!auditItem) {
                            missingItems.push(templateItem.id);
                            return;
                          }
                          
                          const markValue = auditItem.mark;
                          if (markValue === null || markValue === undefined) {
                            missingItems.push(templateItem.id);
                            return;
                          }
                          
                          const markStr = String(markValue).trim();
                          if (markStr === '') {
                            missingItems.push(templateItem.id);
                            return;
                          }
                          
                          const isNA = markStr.toUpperCase() === 'NA' || markStr.toUpperCase() === 'N/A';
                          if (isNA || markStr.length > 0) {
                            completed++;
                          } else {
                            missingItems.push(templateItem.id);
                          }
                        });
                        
                        const auditStatus = (completed === templateTotal && templateTotal > 0 && missingItems.length === 0) ? 'completed' : 'in_progress';
                        
                        if (missingItems.length > 0) {
                          logger.info(`[Audit ${auditId} - Fallback] Forcing status to 'in_progress': ${missingItems.length} items missing marks out of ${templateTotal} total`);
                        }

                        dbInstance.run(
                          `UPDATE audits 
                           SET completed_items = ?, score = ?, status = ?, 
                               completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
                           WHERE id = ?`,
                          [completed, score, auditStatus, completed, templateTotal, auditId],
                          function(updateErr) {
                            if (updateErr) {
                              logger.error('Error updating audit:', updateErr.message);
                            }
                            if (auditStatus === 'completed') {
                              handleScheduledAuditCompletion(dbInstance, auditId, 'completed');
                              // Auto-create action items for failed items
                              const { autoCreateActionItems } = require('../utils/autoActions');
                              autoCreateActionItems(dbInstance, auditId, { onlyCritical: false, defaultDueDays: 7 }, (err, actions) => {
                                if (err) {
                                  logger.error('Error auto-creating action items:', err);
                                } else if (actions && actions.length > 0) {
                                  logger.info(`[Auto-Actions] Created ${actions.length} action items for completed audit ${auditId}`);
                                }
                              });
                            }
                            res.json({ message: 'Audit item updated successfully' });
                          }
                        );
                      }
                    );
                  }
                );
              });
            } else {
              res.json({ message: 'Audit item updated successfully' });
            }
          }
        );
      }
    }
  });
});

// Batch update audit items - OPTIMIZED for faster saves
router.put('/:id/items/batch', authenticate, async (req, res) => {
  const auditId = parseInt(req.params.id, 10);
  logger.debug(`[Batch Update] Audit ID: ${auditId}, Body keys: ${Object.keys(req.body || {}).join(', ')}`);
  
  if (isNaN(auditId)) {
    logger.warn('[Batch Update] Invalid audit ID provided');
    return res.status(400).json({ error: 'Invalid audit ID' });
  }
  const { items } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  logger.debug(`[Batch Update] Items received: ${items ? (Array.isArray(items) ? items.length : 'not array') : 'undefined'}`);
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    logger.warn(`[Batch Update] Invalid items: items=${!!items}, isArray=${Array.isArray(items)}, length=${items?.length}`);
    return res.status(400).json({ error: 'Items array is required', debug: { hasItems: !!items, isArray: Array.isArray(items), length: items?.length } });
  }

  // Verify audit belongs to user
  const whereClause = isAdmin ? 'id = ?' : 'id = ? AND user_id = ?';
  const queryParams = isAdmin ? [auditId] : [auditId, userId];

  dbInstance.get(`SELECT * FROM audits WHERE ${whereClause}`, queryParams, async (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    if (audit.status === 'completed' && !isAdmin) {
      return res.status(403).json({ error: 'Cannot modify items in a completed audit' });
    }

    // If this audit is linked to a scheduled audit and status is still pending,
    // mark the scheduled audit as in_progress when user first starts working
    if (audit.scheduled_audit_id) {
      dbInstance.get(
        'SELECT status FROM scheduled_audits WHERE id = ?',
        [audit.scheduled_audit_id],
        (scheduleErr, schedule) => {
          if (!scheduleErr && schedule && 
              schedule.status !== 'in_progress' && 
              schedule.status !== 'completed') {
            // Mark scheduled audit as in_progress when user first starts working
            markScheduledAuditInProgress(dbInstance, audit.scheduled_audit_id);
          }
        }
      );
    }

    try {
      // Prefetch checklist item metadata so we can auto-calculate marks for time-based items
      const uniqueItemIds = [...new Set(items.map(i => parseInt(i.itemId, 10)).filter(id => !isNaN(id)))];
      const itemMetaById = await new Promise((resolve) => {
        if (uniqueItemIds.length === 0) return resolve({});
        const placeholders = uniqueItemIds.map(() => '?').join(',');
        dbInstance.all(
          `SELECT id, input_type, required, is_time_based, target_time_minutes, min_time_minutes, max_time_minutes 
           FROM checklist_items WHERE id IN (${placeholders})`,
          uniqueItemIds,
          (metaErr, rows) => {
            if (metaErr) {
              logger.warn('[Batch Update] Failed to prefetch checklist_items meta for time scoring:', metaErr.message);
              return resolve({});
            }
            const map = {};
            (rows || []).forEach(r => { map[r.id] = r; });
            resolve(map);
          }
        );
      });

      const isFilledValue = (value) =>
        value !== undefined && value !== null && String(value).trim() !== '';

      const isItemComplete = (payload, meta) => {
        const inputType = String(meta?.input_type || '').toLowerCase();
        const status = payload.status;
        const hasStatus = status && status !== 'pending';
        const hasOption = payload.selected_option_id !== undefined && payload.selected_option_id !== null;
        const hasPhoto = isFilledValue(payload.photo_url);
        const hasComment = isFilledValue(payload.comment);
        const hasMarkValue = isFilledValue(payload.mark) && String(payload.mark).toUpperCase() !== 'NA';

        if (inputType === 'option_select' || inputType === 'select_from_data_source') return !!hasOption;
        if (inputType === 'image_upload') return !!hasPhoto;
        if (['open_ended', 'description', 'number', 'date', 'scan_code', 'signature'].includes(inputType)) {
          return hasComment || hasMarkValue;
        }
        // task or unknown types fall back to status
        return !!hasStatus;
      };

      const missingRequired = items
        .map(item => {
          const itemId = parseInt(item.itemId, 10);
          if (isNaN(itemId)) return null;
          const meta = itemMetaById[itemId];
          const isRequired = meta && (meta.required === 1 || meta.required === true);
          if (!isRequired) return null;
          return isItemComplete(item, meta) ? null : { itemId, input_type: meta?.input_type || null };
        })
        .filter(Boolean);

      if (missingRequired.length > 0) {
        logger.warn('[Batch Update] Required items missing', { auditId, count: missingRequired.length });
        return res.status(400).json({
          error: 'Required checklist items are incomplete',
          missingRequired
        });
      }

      // Process all items in parallel using Promise.all
      const updatePromises = items.map(item => {
        return new Promise((resolve, reject) => {
          const { status, comment, photo_url, mark, time_taken_minutes, started_at, time_entries, average_time_minutes } = item;
          // Parse itemId and selected_option_id to integer for MSSQL compatibility
          const itemId = parseInt(item.itemId, 10);
          const selected_option_id = item.selected_option_id ? parseInt(item.selected_option_id, 10) : null;
          
          if (isNaN(itemId)) {
            return reject(new Error(`Invalid item ID: ${item.itemId}`));
          }
          
          // Check if item exists
          dbInstance.get(
            'SELECT id FROM audit_items WHERE audit_id = ? AND item_id = ?',
            [auditId, itemId],
            (err, existingItem) => {
              if (err) return reject(err);

              if (!existingItem) {
                // Insert new item
                // IMPORTANT: If an option is selected, automatically set status to 'completed'
                // This ensures items are marked as completed when an option is chosen
                let itemStatus = status || 'pending';
                let effectiveMark = mark;

                // Auto-calculate mark for time-based items (preparation time audits)
                const meta = itemMetaById[itemId];
                const isTimeBased = meta && (meta.is_time_based === 1 || meta.is_time_based === true);
                const providedAvg = average_time_minutes !== undefined && average_time_minutes !== null
                  ? Number(average_time_minutes)
                  : null;
                const computedAvg = Number.isFinite(providedAvg) && providedAvg > 0 ? providedAvg : computeAverageMinutes(time_entries);
                const validCount = parseTimeEntriesToArray(time_entries)
                  .map(t => Number(t))
                  .filter(t => Number.isFinite(t) && t > 0).length;

                const markEmpty = effectiveMark === undefined || effectiveMark === null || String(effectiveMark).trim() === '';
                if (isTimeBased && markEmpty && computedAvg !== null && validCount >= 4) {
                  const computedScore = calculateTimeBasedScore(computedAvg, meta?.target_time_minutes || 2);
                  if (computedScore !== null) {
                    effectiveMark = String(computedScore);
                    itemStatus = 'completed';
                    logger.debug(`[Batch Update] Auto-calculated time-based mark for item ${itemId}: avg=${computedAvg}, score=${effectiveMark}`);
                  }
                }

                if (selected_option_id && mark && itemStatus === 'pending') {
                  itemStatus = 'completed';
                  logger.debug(`[Batch Update] Auto-setting status to 'completed' for new item ${itemId} with selected_option_id ${selected_option_id}`);
                }
                
                const insertFields = ['audit_id', 'item_id', 'status', 'comment', 'photo_url', 'selected_option_id', 'mark'];
                const insertValues = [auditId, itemId, itemStatus, comment || null, photo_url || null, selected_option_id, effectiveMark || null];
                const insertPlaceholders = ['?', '?', '?', '?', '?', '?', '?'];
                
                // Add time tracking fields if provided (only if columns exist)
                // Note: These columns may not exist in all databases yet
                if (time_taken_minutes !== undefined && time_taken_minutes !== null) {
                  insertFields.push('time_taken_minutes');
                  insertValues.push(time_taken_minutes);
                  insertPlaceholders.push('?');
                }
                if (started_at !== undefined && started_at !== null) {
                  insertFields.push('started_at');
                  insertValues.push(started_at);
                  insertPlaceholders.push('?');
                }
                // Multi-time entries for Item Making Performance
                if (time_entries !== undefined && time_entries !== null) {
                  insertFields.push('time_entries');
                  insertValues.push(typeof time_entries === 'string' ? time_entries : JSON.stringify(time_entries));
                  insertPlaceholders.push('?');
                }
                if (average_time_minutes !== undefined && average_time_minutes !== null) {
                  insertFields.push('average_time_minutes');
                  insertValues.push(average_time_minutes);
                  insertPlaceholders.push('?');
                }
                
                // Try to insert, but handle column errors gracefully
                dbInstance.run(
                  `INSERT INTO audit_items (${insertFields.join(', ')}) 
                   VALUES (${insertPlaceholders.join(', ')})`,
                  insertValues,
                  function(err) {
                    if (err) {
                      // If error is about missing column, try without time tracking columns
                      if (err.message && (err.message.includes('no such column') || err.message.includes('Invalid column name'))) {
                        logger.warn(`[Batch Update] Time tracking columns may not exist, retrying without them for item ${itemId}`);
                        // Retry without time tracking columns
                        const basicFields = ['audit_id', 'item_id', 'status', 'comment', 'photo_url', 'selected_option_id', 'mark'];
                        const basicValues = [auditId, itemId, status || 'pending', comment || null, photo_url || null, selected_option_id, mark || null];
                        const basicPlaceholders = ['?', '?', '?', '?', '?', '?', '?'];
                        
                        dbInstance.run(
                          `INSERT INTO audit_items (${basicFields.join(', ')}) 
                           VALUES (${basicPlaceholders.join(', ')})`,
                          basicValues,
                          function(retryErr) {
                            if (retryErr) {
                              logger.error(`[Batch Update] Error inserting item ${itemId} (retry):`, retryErr);
                              return reject(retryErr);
                            }
                            resolve({ itemId, action: 'inserted' });
                          }
                        );
                      } else {
                        logger.error(`[Batch Update] Error inserting item ${itemId}:`, err);
                        logger.error(`[Batch Update] Insert SQL: INSERT INTO audit_items (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`);
                        logger.error(`[Batch Update] Insert values:`, insertValues);
                        return reject(err);
                      }
                    } else {
                      resolve({ itemId, action: 'inserted' });
                    }
                  }
                );
              } else {
                // Update existing item
                // IMPORTANT: If an option is selected but status is 'pending', automatically set to 'completed'
                // This ensures items are marked as completed when an option is chosen
                let itemStatus = status || 'pending';
                let effectiveMark = mark;

                // Auto-calculate mark for time-based items (preparation time audits)
                const meta = itemMetaById[itemId];
                const isTimeBased = meta && (meta.is_time_based === 1 || meta.is_time_based === true);
                const providedAvg = average_time_minutes !== undefined && average_time_minutes !== null
                  ? Number(average_time_minutes)
                  : null;
                const computedAvg = Number.isFinite(providedAvg) && providedAvg > 0 ? providedAvg : computeAverageMinutes(time_entries);
                const validCount = parseTimeEntriesToArray(time_entries)
                  .map(t => Number(t))
                  .filter(t => Number.isFinite(t) && t > 0).length;

                const markEmpty = effectiveMark === undefined || effectiveMark === null || String(effectiveMark).trim() === '';
                if (isTimeBased && markEmpty && computedAvg !== null && validCount >= 4) {
                  const computedScore = calculateTimeBasedScore(computedAvg, meta?.target_time_minutes || 2);
                  if (computedScore !== null) {
                    effectiveMark = String(computedScore);
                    itemStatus = 'completed';
                    logger.debug(`[Batch Update] Auto-calculated time-based mark for item ${itemId}: avg=${computedAvg}, score=${effectiveMark}`);
                  }
                }

                if (selected_option_id && mark && itemStatus === 'pending') {
                  itemStatus = 'completed';
                  logger.debug(`[Batch Update] Auto-setting status to 'completed' for item ${itemId} with selected_option_id ${selected_option_id}`);
                }
                
                const updateFields = ['status = ?', 'comment = ?', 'photo_url = ?'];
                const updateValues = [itemStatus, comment || null, photo_url || null];
                
                if (selected_option_id !== undefined) {
                  updateFields.push('selected_option_id = ?');
                  updateValues.push(selected_option_id || null);
                }
                if (mark !== undefined) {
                  updateFields.push('mark = ?');
                  updateValues.push(effectiveMark || null);
                }
                if (time_taken_minutes !== undefined && time_taken_minutes !== null) {
                  updateFields.push('time_taken_minutes = ?');
                  updateValues.push(time_taken_minutes);
                }
                if (started_at !== undefined && started_at !== null) {
                  updateFields.push('started_at = ?');
                  updateValues.push(started_at);
                }
                // Multi-time entries for Item Making Performance
                if (time_entries !== undefined && time_entries !== null) {
                  updateFields.push('time_entries = ?');
                  updateValues.push(typeof time_entries === 'string' ? time_entries : JSON.stringify(time_entries));
                }
                if (average_time_minutes !== undefined && average_time_minutes !== null) {
                  updateFields.push('average_time_minutes = ?');
                  updateValues.push(average_time_minutes);
                }
                if (itemStatus === 'completed') {
                  updateFields.push('completed_at = CURRENT_TIMESTAMP');
                  // If time_taken_minutes not provided but started_at exists, calculate it
                  // Note: For SQL Server, we skip auto-calculation to avoid SQL injection
                  // The frontend should send time_taken_minutes when available
                  if (time_taken_minutes === undefined && started_at) {
                    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
                    const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
                    
                    if (!isSqlServer) {
                      // SQLite: Use julianday
                      updateFields.push('time_taken_minutes = ROUND((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 1440, 2)');
                    }
                    // For SQL Server, skip auto-calculation - frontend should calculate and send time_taken_minutes
                  }
                }
                
                updateValues.push(auditId, itemId);
                
                // Try to update, but handle column errors gracefully
                dbInstance.run(
                  `UPDATE audit_items SET ${updateFields.join(', ')} WHERE audit_id = ? AND item_id = ?`,
                  updateValues,
                  function(err) {
                    if (err) {
                      // If error is about missing column, try without time tracking columns
                      if (err.message && (err.message.includes('no such column') || err.message.includes('Invalid column name'))) {
                        logger.warn(`[Batch Update] Time tracking columns may not exist, retrying without them for item ${itemId}`);
                        // Retry without time tracking columns
                        const basicFields = ['status = ?', 'comment = ?', 'photo_url = ?'];
                        const basicValues = [status || 'pending', comment || null, photo_url || null];
                        
                        if (selected_option_id !== undefined) {
                          basicFields.push('selected_option_id = ?');
                          basicValues.push(selected_option_id || null);
                        }
                        if (mark !== undefined) {
                          basicFields.push('mark = ?');
                          basicValues.push(mark || null);
                        }
                        if (status === 'completed') {
                          basicFields.push('completed_at = CURRENT_TIMESTAMP');
                        }
                        
                        basicValues.push(auditId, itemId);
                        
                        dbInstance.run(
                          `UPDATE audit_items SET ${basicFields.join(', ')} WHERE audit_id = ? AND item_id = ?`,
                          basicValues,
                          function(retryErr) {
                            if (retryErr) {
                              logger.error(`[Batch Update] Error updating item ${itemId} (retry):`, retryErr);
                              return reject(retryErr);
                            }
                            resolve({ itemId, action: 'updated' });
                          }
                        );
                      } else {
                        logger.error(`[Batch Update] Error updating item ${itemId}:`, err);
                        logger.error(`[Batch Update] Update SQL: UPDATE audit_items SET ${updateFields.join(', ')} WHERE audit_id = ? AND item_id = ?`);
                        logger.error(`[Batch Update] Update values:`, updateValues);
                        return reject(err);
                      }
                    } else {
                      resolve({ itemId, action: 'updated' });
                    }
                  }
                );
              }
            }
          );
        });
      });

      const results = await Promise.all(updatePromises);
      logger.debug(`[Batch Update] Successfully processed ${results.length} items`);

      // Handle audit_category: allow clearing it (null) to support multi-category audits
      // If explicitly set to null, clear the category to allow multiple categories in same audit
      const requestedAuditCategory = req.body.hasOwnProperty('audit_category') 
        ? (typeof req.body.audit_category === 'string' && req.body.audit_category.trim()
            ? req.body.audit_category.trim()
            : null)
        : undefined; // Not provided, don't change
      
      const effectiveAuditCategory = requestedAuditCategory !== undefined 
        ? requestedAuditCategory 
        : (audit.audit_category || null);

      const maybeUpdateCategory = () => new Promise((resolve) => {
        // If explicitly set (including null), update it
        if (requestedAuditCategory !== undefined) {
          dbInstance.run(
            'UPDATE audits SET audit_category = ? WHERE id = ?',
            [requestedAuditCategory, auditId],
            () => resolve() // don't block the save on this update
          );
        } else {
          resolve();
        }
      });

      await maybeUpdateCategory();

      // Calculate score once after all updates
      // If this is a category-wise audit (audit_category set), scope completion/score to that category.
      calculateAndUpdateScore(dbInstance, auditId, audit.template_id, effectiveAuditCategory, (err, scoreData) => {
        if (err) {
          logger.error('Error calculating score:', err);
          // Still return success for item updates, but log the score calculation error
        }
        
        // Log completion status for debugging
        if (scoreData) {
          logger.info(`[Batch Update] Audit ${auditId} - Status: ${scoreData.status}, Score: ${scoreData.score}%, Completed: ${scoreData.completed}/${scoreData.total} items`);
          
          // Auto-create action items for failed items when audit is completed
          if (scoreData.status === 'completed') {
            const { autoCreateActionItems } = require('../utils/autoActions');
            autoCreateActionItems(dbInstance, auditId, { onlyCritical: false, defaultDueDays: 7 }, (err, actions) => {
              if (err) {
                logger.error('Error auto-creating action items:', err);
              } else if (actions && actions.length > 0) {
                logger.info(`[Auto-Actions] Created ${actions.length} action items for completed audit ${auditId}`);
              }
            });
          }
        }
        
        if (scoreData && scoreData.status === 'completed') {
          logger.info(`[Batch Update] Audit ${auditId} is completed - updating scheduled audit status`);
          // Pass the status directly to avoid re-reading from database
          handleScheduledAuditCompletion(dbInstance, auditId, 'completed');
        }
        
        res.json({ 
          message: 'Audit items updated successfully', 
          updatedCount: items.length,
          score: scoreData?.score,
          status: scoreData?.status,
          completed: scoreData?.completed,
          total: scoreData?.total
        });
      });

    } catch (error) {
      logger.error('Error in batch update:', error);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      
      // Provide more detailed error information
      const errorDetails = {
        message: error.message,
        auditId: auditId,
        itemCount: items?.length || 0,
        firstItemId: items?.[0]?.itemId || 'N/A'
      };
      
      res.status(500).json({ 
        error: 'Error updating audit items', 
        details: error.message,
        debug: errorDetails
      });
    }
  });
});

// Helper function to calculate and update audit score
// If auditCategory is provided, scoring/completion is calculated only for items in that category.
function calculateAndUpdateScore(dbInstance, auditId, templateId, auditCategory, callback) {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  // IMPORTANT: For completion status, always check ALL audit items, not just the selected category.
  // The audit_category is only used for scoping the work during editing, but completion should
  // consider all items in the template to ensure the audit is truly complete.
  // Get audit items with their marks (always fetch all items for completion check)
  const auditItemsQuery = `SELECT ai.item_id, ai.mark FROM audit_items ai WHERE ai.audit_id = ?`;
  const auditItemsParams = [auditId];

  dbInstance.all(
    auditItemsQuery,
    auditItemsParams,
    (err, auditItems) => {
      if (err) return callback(err);

      // Get max possible score from template (use MAX numeric score, not just "Yes")
      let query;
      if (isSqlServer) {
        query = `SELECT ci.id, 
                 (SELECT MAX(CASE WHEN ISNUMERIC(cio.mark) = 1 THEN CAST(cio.mark AS FLOAT) ELSE NULL END)
                  FROM checklist_item_options cio 
                  WHERE cio.item_id = ci.id) as max_score
                 FROM checklist_items ci WHERE ci.template_id = ?`;
      } else {
        query = `SELECT ci.id, 
                 (SELECT MAX(CASE WHEN cio.mark NOT LIKE '%NA%' AND cio.mark GLOB '[0-9]*' THEN CAST(cio.mark AS REAL) ELSE NULL END)
                  FROM checklist_item_options cio 
                  WHERE cio.item_id = ci.id) as max_score
                 FROM checklist_items ci WHERE ci.template_id = ?`;
      }

      // IMPORTANT: For completion status, always check ALL template items, not just the selected category.
      // The audit_category is only used for scoping the work during editing, but completion should
      // consider all items in the template to ensure the audit is truly complete.
      const templateParams = [templateId];
      // Remove category filter for completion check - we want to check ALL items
      // if (auditCategory) {
      //   query += ' AND ci.category = ?';
      //   templateParams.push(auditCategory);
      // }

      dbInstance.all(query, templateParams, (err, templateItems) => {
        if (err) return callback(err);

        let totalPossibleScore = 0;
        templateItems.forEach(item => {
          if (item.max_score !== null) {
            totalPossibleScore += parseFloat(item.max_score) || 0;
          }
        });

        let actualScore = 0;
        auditItems.forEach(item => {
          if (item.mark && item.mark !== 'NA') {
            actualScore += parseFloat(item.mark) || 0;
          }
        });

        // Ensure score is capped at 100%
        const score = totalPossibleScore > 0 
          ? Math.min(100, Math.round((actualScore / totalPossibleScore) * 100))
          : 0;

        // Compare against ALL template items, not just audit items created
        // This ensures completion is based on all items in the template, including those not yet started
        // templateItems is already fetched above, so we can use it directly
        const total = templateItems.length;
        
        // Create a map of audit items by item_id for quick lookup
        const auditItemMap = {};
        auditItems.forEach(item => {
          auditItemMap[item.item_id] = item;
        });
        
        // Count how many template items have been completed
        // An item is completed only if:
        // 1. It exists in audit_items
        // 2. It has a valid mark (not null, not empty, not undefined, or is 'NA')
        // 3. The mark is a meaningful value (not just whitespace)
        let completed = 0;
        let missingItems = [];
        
        templateItems.forEach(templateItem => {
          const auditItem = auditItemMap[templateItem.id];
          if (!auditItem) {
            // Item doesn't exist in audit_items yet - not completed
            missingItems.push(templateItem.id);
            return;
          }
          
          // Check if item has a valid mark - be very strict
          const markValue = auditItem.mark;
          
          // Check for null, undefined, or empty
          if (markValue === null || markValue === undefined) {
            missingItems.push(templateItem.id);
            return;
          }
          
          // Convert to string and trim
          const markStr = String(markValue).trim();
          
          // Check if it's empty after trimming
          if (markStr === '') {
            missingItems.push(templateItem.id);
            return;
          }
          
          // Check if it's NA (case-insensitive)
          const isNA = markStr.toUpperCase() === 'NA' || markStr.toUpperCase() === 'N/A';
          
          // If it's NA or has a non-empty value, it's completed
          if (isNA || markStr.length > 0) {
            completed++;
          } else {
            missingItems.push(templateItem.id);
          }
        });
        
        // Log for debugging if items are missing
        if (missingItems.length > 0) {
          logger.info(`[Audit ${auditId} - Batch] Completion check: ${completed}/${total} items completed. Missing marks for ${missingItems.length} items.`);
          if (missingItems.length <= 10) {
            logger.debug(`[Audit ${auditId} - Batch] Missing marks for items: ${missingItems.join(', ')}`);
          }
        }
        
        // Only mark as completed if ALL items have valid marks
        const auditStatus = (completed === total && total > 0 && missingItems.length === 0) ? 'completed' : 'in_progress';
        
        // Force in_progress if any items are missing
        if (missingItems.length > 0) {
          logger.info(`[Audit ${auditId} - Batch] Forcing status to 'in_progress': ${missingItems.length} items missing marks out of ${total} total items`);
        }
        
        dbInstance.run(
          `UPDATE audits 
           SET completed_items = ?, score = ?, status = ?, 
               completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
           WHERE id = ?`,
          [completed, score, auditStatus, completed, total, auditId],
          function(err) {
            if (err) return callback(err);
            
            // Log completion status for debugging
            if (auditStatus === 'completed') {
              logger.info(`[Audit ${auditId} - Batch] Audit marked as completed: ${completed}/${total} items completed`);
            } else {
              logger.debug(`[Audit ${auditId} - Batch] Audit status: ${auditStatus}, ${completed}/${total} items completed, ${missingItems.length} missing`);
            }
            
            callback(null, { score, status: auditStatus, completed, total });
          }
        );
      });
    }
  );
}

// Complete audit
router.put('/:id/complete', authenticate, (req, res) => {
  const auditId = parseInt(req.params.id, 10);
  if (isNaN(auditId)) {
    return res.status(400).json({ error: 'Invalid audit ID' });
  }
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.get('SELECT * FROM audits WHERE id = ? AND user_id = ?', [auditId, userId], (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    dbInstance.all(
      `SELECT COUNT(*) as total, 
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM audit_items WHERE audit_id = ?`,
      [auditId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const completed = result[0].completed || 0;
        const total = result[0].total || 0;
        const score = total > 0 ? Math.round((completed / total) * 100) : 0;

        dbInstance.run(
          `UPDATE audits 
           SET status = 'completed', score = ?, completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [score, auditId],
          async (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error completing audit' });
            }

            handleScheduledAuditCompletion(dbInstance, auditId, 'completed');

            // Auto-create action items for failed items
            const { autoCreateActionItems } = require('../utils/autoActions');
            autoCreateActionItems(dbInstance, auditId, { onlyCritical: false, defaultDueDays: 7 }, (err, actions) => {
              if (err) {
                logger.error('Error auto-creating action items:', err);
              } else if (actions && actions.length > 0) {
                logger.info(`[Auto-Actions] Created ${actions.length} action items for completed audit ${auditId}`);
              }
            });

            // Send notification to audit creator
            try {
              await createNotification(
                userId,
                'audit',
                'Audit Completed',
                `Audit "${audit.restaurant_name}" has been completed with a score of ${score}%`,
                `/audits/${auditId}`,
                {
                  template: 'auditCompleted',
                  data: [audit.restaurant_name, score, audit.location_name || 'Not specified']
                }
              );
            } catch (notifErr) {
              logger.error('Error creating completion notification:', notifErr.message);
            }

            // Generate PDF report automatically after completion
            try {
              const pdfUrl = `/api/reports/audit/${auditId}/pdf`;
              logger.info(`[PDF Generation] PDF will be available at: ${pdfUrl}`);
              // PDF is generated on-demand when accessed, so we just log the URL
            } catch (pdfErr) {
              logger.error('Error preparing PDF generation:', pdfErr.message);
            }

            // Generate Action Plan with top-3 deviations and CREATE action items
            try {
              generateActionPlanWithDeviations(dbInstance, auditId, (err, actionPlan) => {
                if (err) {
                  logger.error('Error generating action plan:', err);
                } else if (actionPlan && actionPlan.deviations && actionPlan.deviations.length > 0) {
                  logger.info(`[Action Plan] Generated action plan with ${actionPlan.deviations.length} deviations`);
                  
                  // Create actual action items from top-3 deviations
                  const { autoCreateActionItems } = require('../utils/autoActions');
                  // Get top 3 failed items to create action items
                  dbInstance.all(
                    `SELECT ai.*, ci.title, ci.description, ci.category, ci.is_critical,
                            cio.option_text, cio.mark
                     FROM audit_items ai
                     JOIN checklist_items ci ON ai.item_id = ci.id
                     LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
                     WHERE ai.audit_id = ?
                       AND (
                         ai.status = 'failed' 
                         OR ai.mark = '0' 
                         OR (cio.mark IS NOT NULL AND cio.mark IN ('No', 'N', 'Fail', 'F', '0'))
                         OR (ai.mark IS NOT NULL AND parseFloat(ai.mark) = 0)
                       )
                     ORDER BY 
                       CASE WHEN ci.is_critical = 1 THEN 0 ELSE 1 END,
                       CASE WHEN ai.mark IS NOT NULL THEN parseFloat(ai.mark) ELSE 999 END ASC
                     LIMIT 3`,
                    [auditId],
                    (err, topDeviations) => {
                      if (!err && topDeviations && topDeviations.length > 0) {
                        // Create action items for top 3 deviations
                        autoCreateActionItems(dbInstance, auditId, { 
                          onlyCritical: false, 
                          defaultDueDays: 7,
                          specificItems: topDeviations.map(d => d.item_id) // Only create for top 3
                        }, (err, actions) => {
                          if (err) {
                            logger.error('Error creating action items from deviations:', err);
                          } else if (actions && actions.length > 0) {
                            logger.info(`[Action Plan] Created ${actions.length} action items from top-3 deviations for audit ${auditId}`);
                          }
                        });
                      }
                    }
                  );
                }
              });
            } catch (actionPlanErr) {
              logger.error('Error generating action plan:', actionPlanErr.message);
            }

            res.json({ 
              message: 'Audit completed successfully', 
              score,
              pdfUrl: `/api/reports/audit/${auditId}/pdf`,
              actionPlanUrl: `/api/audits/${auditId}/action-plan`
            });
          }
        );
      }
    );
  });
});

// Get Action Plan with top-3 deviations for a completed audit
router.get('/:id/action-plan', authenticate, (req, res) => {
  const auditId = parseInt(req.params.id, 10);
  if (isNaN(auditId)) {
    return res.status(400).json({ error: 'Invalid audit ID' });
  }

  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  const whereClause = isAdmin ? 'WHERE id = ?' : 'WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [auditId] : [auditId, userId];

  dbInstance.get(`SELECT * FROM audits ${whereClause}`, params, (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    if (audit.status !== 'completed') {
      return res.status(400).json({ error: 'Audit must be completed to generate action plan' });
    }

    generateActionPlanWithDeviations(dbInstance, auditId, (err, actionPlan) => {
      if (err) {
        logger.error('Error generating action plan:', err);
        return res.status(500).json({ error: 'Error generating action plan', details: err.message });
      }

      res.json({
        audit_id: auditId,
        restaurant_name: audit.restaurant_name,
        completed_at: audit.completed_at,
        score: audit.score,
        deviations: actionPlan.deviations,
        total_deviations: actionPlan.total_deviations
      });
    });
  });
});

// Delete single audit
router.delete('/:id', authenticate, (req, res) => {
  const auditId = parseInt(req.params.id, 10);
  if (isNaN(auditId)) {
    return res.status(400).json({ error: 'Invalid audit ID' });
  }
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { requirePermission, getUserPermissions, hasPermission } = require('../middleware/permissions');
  const isAdmin = isAdminUser(req.user);

  // Check permissions first
  getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
    if (permErr) {
      logger.error('Error fetching permissions:', permErr);
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const canDelete = isAdmin || 
                      hasPermission(userPermissions, 'delete_audits') ||
                      hasPermission(userPermissions, 'manage_audits');

    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete audits' });
    }

    // Verify audit exists and check ownership (admins can delete any audit, others only their own)
    let query = 'SELECT * FROM audits WHERE id = ?';
    let params = [auditId];
    
    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
  
  dbInstance.get(query, params, (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      if (isAdmin) {
        return res.status(404).json({ error: 'Audit not found' });
      } else {
        return res.status(403).json({ error: 'Audit not found or you do not have permission to delete it' });
      }
    }

    // Delete audit items first (cascade)
    dbInstance.run('DELETE FROM audit_items WHERE audit_id = ?', [auditId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting audit items' });
      }

      // Delete action items
      dbInstance.run('DELETE FROM action_items WHERE audit_id = ?', [auditId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error deleting action items' });
        }

        // Delete audit
        dbInstance.run('DELETE FROM audits WHERE id = ?', [auditId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error deleting audit' });
          }
          res.json({ message: 'Audit deleted successfully' });
        });
      });
    });
    });
  });
});

// Bulk delete audits
router.post('/bulk-delete', authenticate, (req, res) => {
  const { auditIds } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  if (!auditIds || !Array.isArray(auditIds) || auditIds.length === 0) {
    return res.status(400).json({ error: 'Audit IDs are required' });
  }

  // Verify audits exist and check ownership (admins can delete any audit)
  const placeholders = auditIds.map(() => '?').join(',');
  let query = `SELECT id FROM audits WHERE id IN (${placeholders})`;
  let params = [...auditIds];
  
  // Non-admin users can only delete their own audits
  if (!isAdmin) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  
  dbInstance.all(query, params, (err, validAudits) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Check if all requested audits were found
    if (validAudits.length !== auditIds.length) {
      if (isAdmin) {
        return res.status(404).json({ error: 'Some audits were not found' });
      } else {
        return res.status(403).json({ error: 'Some audits do not belong to you or were not found' });
      }
    }

    const validIds = validAudits.map(a => a.id);
    const validPlaceholders = validIds.map(() => '?').join(',');

    // Delete audit items
    dbInstance.run(`DELETE FROM audit_items WHERE audit_id IN (${validPlaceholders})`, validIds, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting audit items' });
      }

      // Delete action items
      dbInstance.run(`DELETE FROM action_items WHERE audit_id IN (${validPlaceholders})`, validIds, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error deleting action items' });
        }

        // Delete audits
        dbInstance.run(`DELETE FROM audits WHERE id IN (${validPlaceholders})`, validIds, function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error deleting audits' });
          }
          res.json({ message: `${validIds.length} audit(s) deleted successfully`, deletedCount: validIds.length });
        });
      });
    });
  });
});

// ========================================
// RECURRING FAILURES ENDPOINTS
// ========================================

// Get previous audit failures for highlighting during new audit
router.get('/previous-failures', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { template_id, location_id, months_back = 1 } = req.query;
  
  // Parse and validate IDs
  if (!template_id || !location_id) {
    return res.status(400).json({ error: 'template_id and location_id are required' });
  }
  
  const templateId = parseInt(template_id, 10);
  const locationId = parseInt(location_id, 10);
  const monthsBack = parseInt(months_back, 10) || 1;
  
  if (isNaN(templateId) || isNaN(locationId) || templateId <= 0 || locationId <= 0) {
    return res.status(400).json({ error: 'template_id and location_id must be valid positive numbers' });
  }
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
  
  // Get the most recent completed audit for this template and location
  // Look back up to 12 months to find previous audits
  const maxMonthsBack = Math.min(monthsBack, 12);
  let previousAuditQuery;
  if (isSqlServer) {
    previousAuditQuery = `
      SELECT TOP 1 a.id, a.score, a.created_at, a.completed_at,
             ct.name as template_name, l.name as location_name
      FROM audits a
      JOIN checklist_templates ct ON a.template_id = ct.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.template_id = ? 
        AND a.location_id = ? 
        AND a.status = 'completed'
        AND a.completed_at >= DATEADD(month, -?, GETDATE())
      ORDER BY a.completed_at DESC, a.created_at DESC
    `;
  } else {
    previousAuditQuery = `
      SELECT a.id, a.score, a.created_at, a.completed_at,
             ct.name as template_name, l.name as location_name
      FROM audits a
      JOIN checklist_templates ct ON a.template_id = ct.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.template_id = ? 
        AND a.location_id = ? 
        AND a.status = 'completed'
        AND a.completed_at >= date('now', '-' || ? || ' months')
      ORDER BY a.completed_at DESC, a.created_at DESC
      LIMIT 1
    `;
  }
  
  dbInstance.get(previousAuditQuery, [templateId, locationId, monthsBack], (err, previousAudit) => {
    if (err) {
      logger.error('Error fetching previous audit:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!previousAudit) {
      return res.json({
        previousAudit: null,
        failedItems: [],
        recurringFailures: [],
        message: 'No previous completed audit found for this location and template'
      });
    }
    
    // Get failed items from the previous audit (items with mark = 0 or 'No' or score < passing)
    const failedItemsQuery = `
      SELECT 
        ai.item_id,
        ci.title,
        ci.description,
        ci.category,
        ai.mark,
        ai.comment,
        ai.photo_url,
        COALESCE(ci.weight, 1) as weight,
        COALESCE(ci.is_critical, 0) as is_critical
      FROM audit_items ai
      JOIN checklist_items ci ON ai.item_id = ci.id
      WHERE ai.audit_id = ?
        AND (
          ai.mark = '0' 
          OR ai.mark = 'No' 
          OR ai.mark = 'Fail'
          OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND CAST(ai.mark AS FLOAT) = 0)
        )
      ORDER BY ci.order_index, ci.id
    `;
    
    dbInstance.all(failedItemsQuery, [previousAudit.id], (err, failedItems) => {
      if (err) {
        logger.error('Error fetching failed items:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get historical failure count for each item (last 6 months)
      let historyQuery;
      if (isSqlServer) {
        historyQuery = `
          SELECT 
            ai.item_id,
            COUNT(*) as failure_count
          FROM audit_items ai
          JOIN audits a ON ai.audit_id = a.id
          WHERE a.template_id = ?
            AND a.location_id = ?
            AND a.status = 'completed'
            AND a.created_at >= DATEADD(month, -6, GETDATE())
            AND (
              ai.mark = '0' 
              OR ai.mark = 'No' 
              OR ai.mark = 'Fail'
              OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND TRY_CAST(ai.mark AS FLOAT) = 0)
            )
          GROUP BY ai.item_id
          HAVING COUNT(*) >= 2
        `;
      } else {
        historyQuery = `
          SELECT 
            ai.item_id,
            COUNT(*) as failure_count
          FROM audit_items ai
          JOIN audits a ON ai.audit_id = a.id
          WHERE a.template_id = ?
            AND a.location_id = ?
            AND a.status = 'completed'
            AND a.created_at >= date('now', '-6 months')
            AND (
              ai.mark = '0' 
              OR ai.mark = 'No' 
              OR ai.mark = 'Fail'
              OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND CAST(ai.mark AS REAL) = 0)
            )
          GROUP BY ai.item_id
          HAVING COUNT(*) >= 2
        `;
      }
      
      dbInstance.all(historyQuery, [template_id, location_id], (err, recurringFailures) => {
        if (err) {
          logger.error('Error fetching recurring failures:', err);
          // Continue without recurring data
          recurringFailures = [];
        }
        
        // Create a map of recurring failures for quick lookup
        const recurringMap = new Map();
        (recurringFailures || []).forEach(rf => {
          recurringMap.set(rf.item_id, rf.failure_count);
        });
        
        // Enhance failed items with failure count
        const enhancedFailedItems = (failedItems || []).map(item => ({
          ...item,
          failure_count: recurringMap.get(item.item_id) || 1,
          is_recurring: recurringMap.has(item.item_id)
        }));
        
        // Get items that are recurring (failed 3+ times)
        let recurringItemsQuery;
        if (isSqlServer) {
          recurringItemsQuery = `
            SELECT 
              ci.id as item_id,
              ci.title,
              ci.category,
              ci.description,
              COUNT(*) as failure_count,
              MAX(a.created_at) as last_failure_date
            FROM audit_items ai
            JOIN audits a ON ai.audit_id = a.id
            JOIN checklist_items ci ON ai.item_id = ci.id
            WHERE a.template_id = ?
              AND a.location_id = ?
              AND a.status = 'completed'
              AND a.created_at >= DATEADD(month, -6, GETDATE())
              AND (
                ai.mark = '0' 
                OR ai.mark = 'No' 
                OR ai.mark = 'Fail'
                OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND TRY_CAST(ai.mark AS FLOAT) = 0)
              )
            GROUP BY ci.id, ci.title, ci.category, ci.description
            HAVING COUNT(*) >= 3
            ORDER BY failure_count DESC
          `;
        } else {
          recurringItemsQuery = `
            SELECT 
              ci.id as item_id,
              ci.title,
              ci.category,
              ci.description,
              COUNT(*) as failure_count,
              MAX(a.created_at) as last_failure_date
            FROM audit_items ai
            JOIN audits a ON ai.audit_id = a.id
            JOIN checklist_items ci ON ai.item_id = ci.id
            WHERE a.template_id = ?
              AND a.location_id = ?
              AND a.status = 'completed'
              AND a.created_at >= date('now', '-6 months')
              AND (
                ai.mark = '0' 
                OR ai.mark = 'No' 
                OR ai.mark = 'Fail'
                OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND CAST(ai.mark AS REAL) = 0)
              )
            GROUP BY ci.id, ci.title, ci.category, ci.description
            HAVING COUNT(*) >= 3
            ORDER BY failure_count DESC
          `;
        }
        
        dbInstance.all(recurringItemsQuery, [template_id, location_id], (err, criticalRecurring) => {
          if (err) {
            logger.error('Error fetching critical recurring:', err);
            criticalRecurring = [];
          }
          
          res.json({
            previousAudit: {
              id: previousAudit.id,
              date: previousAudit.completed_at || previousAudit.created_at,
              score: previousAudit.score,
              template_name: previousAudit.template_name,
              location_name: previousAudit.location_name,
              failed_count: enhancedFailedItems.length
            },
            failedItems: enhancedFailedItems,
            recurringFailures: criticalRecurring || [],
            summary: {
              total_failed_last_audit: enhancedFailedItems.length,
              recurring_items: (criticalRecurring || []).length,
              critical_recurring: (criticalRecurring || []).filter(i => i.failure_count >= 4).length
            }
          });
        });
      });
    });
  });
});

// Get recurring failures summary for a specific store across all templates
router.get('/recurring-failures-by-store/:locationId', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const locationId = parseInt(req.params.locationId);
  
  if (isNaN(locationId)) {
    return res.status(400).json({ error: 'Invalid location ID' });
  }
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
  
  let query;
  if (isSqlServer) {
    query = `
      SELECT 
        ci.id as item_id,
        ci.title,
        ci.category,
        ct.name as template_name,
        ct.id as template_id,
        COUNT(*) as failure_count,
        MAX(a.created_at) as last_failure_date,
        STRING_AGG(CAST(a.id AS VARCHAR), ',') as audit_ids
      FROM audit_items ai
      JOIN audits a ON ai.audit_id = a.id
      JOIN checklist_items ci ON ai.item_id = ci.id
      JOIN checklist_templates ct ON a.template_id = ct.id
      WHERE a.location_id = ?
        AND a.status = 'completed'
        AND a.created_at >= DATEADD(month, -6, GETDATE())
        AND (
          ai.mark = '0' 
          OR ai.mark = 'No' 
          OR ai.mark = 'Fail'
          OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND TRY_CAST(ai.mark AS FLOAT) = 0)
        )
      GROUP BY ci.id, ci.title, ci.category, ct.name, ct.id
      HAVING COUNT(*) >= 2
      ORDER BY failure_count DESC, ci.category
    `;
  } else {
    query = `
      SELECT 
        ci.id as item_id,
        ci.title,
        ci.category,
        ct.name as template_name,
        ct.id as template_id,
        COUNT(*) as failure_count,
        MAX(a.created_at) as last_failure_date,
        GROUP_CONCAT(a.id) as audit_ids
      FROM audit_items ai
      JOIN audits a ON ai.audit_id = a.id
      JOIN checklist_items ci ON ai.item_id = ci.id
      JOIN checklist_templates ct ON a.template_id = ct.id
      WHERE a.location_id = ?
        AND a.status = 'completed'
        AND a.created_at >= date('now', '-6 months')
        AND (
          ai.mark = '0' 
          OR ai.mark = 'No' 
          OR ai.mark = 'Fail'
          OR (ai.mark IS NOT NULL AND ai.mark NOT IN ('NA', 'N/A') AND CAST(ai.mark AS REAL) = 0)
        )
      GROUP BY ci.id, ci.title, ci.category, ct.name, ct.id
      HAVING COUNT(*) >= 2
      ORDER BY failure_count DESC, ci.category
    `;
  }
  
  dbInstance.all(query, [locationId], (err, failures) => {
    if (err) {
      logger.error('Error fetching recurring failures by store:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Group by template
    const byTemplate = {};
    (failures || []).forEach(f => {
      if (!byTemplate[f.template_id]) {
        byTemplate[f.template_id] = {
          template_id: f.template_id,
          template_name: f.template_name,
          items: []
        };
      }
      byTemplate[f.template_id].items.push({
        item_id: f.item_id,
        title: f.title,
        category: f.category,
        failure_count: f.failure_count,
        last_failure_date: f.last_failure_date
      });
    });
    
    res.json({
      location_id: locationId,
      total_recurring_items: (failures || []).length,
      critical_items: (failures || []).filter(f => f.failure_count >= 3).length,
      by_template: Object.values(byTemplate),
      all_failures: failures || []
    });
  });
});

// Get previous audit failures for recurring failures indicator
// Returns items that failed in the last completed audit for the same location and template
router.get('/previous-failures/:templateId/:locationId', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const templateId = parseInt(req.params.templateId, 10);
  const locationId = parseInt(req.params.locationId, 10);
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  if (isNaN(templateId) || isNaN(locationId)) {
    return res.status(400).json({ error: 'Invalid template or location ID' });
  }

  // Find the most recent completed audit for this location and template
  // Look for audits from the last 12 months
  const lastAuditQuery = isSqlServer
    ? `SELECT TOP 1 a.id, a.completed_at, a.created_at
       FROM audits a
       WHERE a.template_id = ? AND a.location_id = ? AND a.status = 'completed'
         AND a.completed_at >= DATEADD(month, -12, GETDATE())
       ${isAdmin ? '' : 'AND a.user_id = ?'}
       ORDER BY a.completed_at DESC, a.created_at DESC`
    : `SELECT a.id, a.completed_at, a.created_at
       FROM audits a
       WHERE a.template_id = ? AND a.location_id = ? AND a.status = 'completed'
         AND a.completed_at >= date('now', '-12 months')
       ${isAdmin ? '' : 'AND a.user_id = ?'}
       ORDER BY a.completed_at DESC, a.created_at DESC
       LIMIT 1`;

  const lastAuditParams = isAdmin ? [templateId, locationId] : [templateId, locationId, userId];

  dbInstance.get(lastAuditQuery, lastAuditParams, (err, lastAudit) => {
    if (err) {
      logger.error('Error fetching last audit for recurring failures:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!lastAudit) {
      // No previous audit found
      return res.json({ failedItems: [], lastAuditDate: null });
    }

    // Get all failed items from the last audit
    // Failed items are those with status 'failed' or selected option with negative mark (No, N/A, etc.)
    const failedItemsQuery = `
      SELECT ai.item_id, ci.title, ci.description, ci.order_index,
             ai.status, ai.selected_option_id, cio.option_text, cio.mark,
             ai.comment, ai.photo_url
      FROM audit_items ai
      JOIN checklist_items ci ON ai.item_id = ci.id
      LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
      WHERE ai.audit_id = ?
        AND (
          ai.status = 'failed'
          OR (cio.mark IS NOT NULL AND (cio.mark IN ('No', 'N', 'NA', 'N/A', 'Fail', 'F'))
          OR (ai.status = 'completed' AND cio.mark IS NOT NULL AND cio.mark NOT IN ('Yes', 'Y', 'Pass', 'P', 'OK')))
        )
      ORDER BY ci.order_index, ci.id
    `;

    dbInstance.all(failedItemsQuery, [lastAudit.id], (itemsErr, failedItems) => {
      if (itemsErr) {
        logger.error('Error fetching failed items:', itemsErr.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        failedItems: failedItems || [],
        lastAuditDate: lastAudit.completed_at,
        lastAuditId: lastAudit.id
      });
    });
  });
});

module.exports = router;

