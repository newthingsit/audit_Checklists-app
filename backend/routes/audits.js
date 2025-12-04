const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { isAdminUser } = require('../middleware/permissions');
const logger = require('../utils/logger');

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

const handleScheduledAuditCompletion = (dbInstance, auditId) => {
  dbInstance.get(
    'SELECT scheduled_audit_id FROM audits WHERE id = ?',
    [auditId],
    (err, auditRow) => {
      if (err) {
        logger.error('Error fetching audit for schedule completion:', err.message);
        return;
      }
      if (!auditRow || !auditRow.scheduled_audit_id) {
        return;
      }

      const scheduleId = auditRow.scheduled_audit_id;
      dbInstance.get(
        'SELECT id, frequency, scheduled_date, status FROM scheduled_audits WHERE id = ?',
        [scheduleId],
        (scheduleErr, schedule) => {
          if (scheduleErr) {
            logger.error('Error fetching scheduled audit for completion:', scheduleErr.message);
            return;
          }
          if (!schedule) return;

          logger.debug(`[Scheduled Audit Completion] Schedule ID: ${scheduleId}, Frequency: ${schedule.frequency}, Status: ${schedule.status}`);

          if (!schedule.frequency || schedule.frequency === 'once') {
            // One-time audit: mark as completed
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ? WHERE id = ?',
              ['completed', scheduleId],
              (updateErr) => {
                if (updateErr) {
                  logger.error('Error marking scheduled audit as completed:', updateErr.message);
                } else {
                  logger.debug(`[Scheduled Audit Completion] Marked schedule ${scheduleId} as completed`);
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
                (updateErr) => {
                  if (updateErr) {
                    logger.error('Error resetting scheduled audit status:', updateErr.message);
                  } else {
                    logger.debug(`[Scheduled Audit Completion] Reset schedule ${scheduleId} to pending`);
                  }
                }
              );
            } else {
              dbInstance.run(
                'UPDATE scheduled_audits SET status = ?, scheduled_date = ?, next_run_date = ? WHERE id = ?',
                ['pending', nextDate, nextDate, scheduleId],
                (updateErr) => {
                  if (updateErr) {
                    logger.error('Error advancing scheduled audit date:', updateErr.message);
                  } else {
                    logger.debug(`[Scheduled Audit Completion] Advanced schedule ${scheduleId} to ${nextDate} with pending status`);
                  }
                }
              );
            }
          }
        }
      );
    }
  );
};

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
  const dbInstance = db.getDb();
  const auditId = parseInt(req.params.id, 10);
  if (isNaN(auditId)) {
    return res.status(400).json({ error: 'Invalid audit ID' });
  }
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

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
        return res.status(500).json({ error: 'Database error' });
      }
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      dbInstance.all(
        `SELECT ai.*, ci.title, ci.description, ci.category, ci.required,
                COALESCE(ci.weight, 1) as weight, COALESCE(ci.is_critical, 0) as is_critical,
                cio.id as selected_option_id, cio.option_text as selected_option_text, cio.mark as selected_mark
         FROM audit_items ai
         JOIN checklist_items ci ON ai.item_id = ci.id
         LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
         WHERE ai.audit_id = ?
         ORDER BY ci.order_index, ci.id`,
        [auditId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Fetch all options for items
          if (items.length === 0) {
            return res.json({ audit, items: [], categoryScores: {} });
          }
          
          const itemIds = items.map(item => item.item_id);
          const placeholders = itemIds.map(() => '?').join(',');
          
          dbInstance.all(
            `SELECT * FROM checklist_item_options WHERE item_id IN (${placeholders}) ORDER BY item_id, order_index, id`,
            itemIds,
            (err, options) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
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
              items.forEach(item => {
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
                const maxScore = yesOption 
                  ? parseFloat(yesOption.mark) || 0 
                  : Math.max(...itemOptions.map(o => parseFloat(o.mark) || 0), 0);
                
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
              
              // Calculate percentage scores for each category
              Object.keys(categoryScores).forEach(category => {
                const cat = categoryScores[category];
                cat.score = cat.totalPossibleScore > 0 
                  ? Math.round((cat.actualScore / cat.totalPossibleScore) * 100) 
                  : 0;
                cat.weightedScore = cat.weightedPossible > 0 
                  ? Math.round((cat.weightedActual / cat.weightedPossible) * 100) 
                  : 0;
              });
              
              // Attach options to items, normalize option_text to text for compatibility
              const itemsWithOptions = items.map(item => ({
                ...item,
                options: (optionsByItem[item.item_id] || []).map(option => ({
                  ...option,
                  text: option.option_text // Add text field for mobile compatibility
                }))
              }));
              
              res.json({ audit, items: itemsWithOptions, categoryScores });
            }
          );
        }
      );
    }
  );
});

// Create new audit
router.post('/', authenticate, (req, res) => {
  const { 
    template_id, restaurant_name, location, location_id, team_id, notes, scheduled_audit_id,
    // GPS location data
    gps_latitude, gps_longitude, gps_accuracy, gps_timestamp, location_verified
  } = req.body;
  const dbInstance = db.getDb();
  const { requirePermission, getUserPermissions, hasPermission } = require('../middleware/permissions');

  if (!template_id || !restaurant_name) {
    return res.status(400).json({ error: 'Template ID and restaurant name are required' });
  }

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
          callback(null, schedule);
        }
      );
    });
  };

  validateScheduledAudit((scheduleErr, linkedSchedule) => {
    if (scheduleErr) {
      return res.status(scheduleErr.status).json({ error: scheduleErr.message });
    }

    // Get template and items
    dbInstance.get('SELECT * FROM checklist_templates WHERE id = ?', [template_id], (err, template) => {
      if (err || !template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      dbInstance.all('SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index, id', 
        [template_id], (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const totalItems = items.length;

          // Create audit - use location_id if provided, otherwise use location text
          dbInstance.run(
            `INSERT INTO audits (template_id, user_id, restaurant_name, location, location_id, team_id, notes, total_items, scheduled_audit_id, gps_latitude, gps_longitude, gps_accuracy, gps_timestamp, location_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [template_id, req.user.id, restaurant_name, location || '', location_id || null, team_id || null, notes || '', totalItems, linkedSchedule ? linkedSchedule.id : null, gps_latitude || null, gps_longitude || null, gps_accuracy || null, gps_timestamp || null, location_verified ? 1 : 0],
            function(err, result) {
              if (err) {
                logger.error('Error creating audit:', err);
                logger.error('Error creating audit:', err);
                return res.status(500).json({ error: 'Error creating audit' });
              }

              // Handle both SQL Server (result.lastID) and SQLite (this.lastID)
              const auditId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
              
              if (!auditId || auditId === 0) {
                logger.error('Failed to get audit ID after insert');
                return res.status(500).json({ error: 'Failed to create audit - no ID returned' });
              }

              if (linkedSchedule) {
                markScheduledAuditInProgress(dbInstance, linkedSchedule.id);
              }

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
          );
        }
      );
    });
  });
});

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
  
  const { status, comment, photo_url, selected_option_id, mark } = req.body;
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
      // First check if audit item exists
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
            const insertFields = ['audit_id', 'item_id', 'status'];
            const insertValues = [auditId, itemId, status || 'pending'];
            const insertPlaceholders = ['?', '?', '?'];
            
            // Always include comment, photo_url, selected_option_id, and mark fields (can be null)
            insertFields.push('comment', 'photo_url', 'selected_option_id', 'mark');
            insertValues.push(comment || null, photo_url || null, validSelectedOptionId, finalMark || null);
            insertPlaceholders.push('?', '?', '?', '?');
            
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
            const updateFields = ['status = ?', 'comment = ?', 'photo_url = ?'];
            const updateValues = [status || 'pending', comment || null, photo_url || null];
            
            if (selected_option_id !== undefined) {
              updateFields.push('selected_option_id = ?');
              updateValues.push(validSelectedOptionId);
            }
            
            if (finalMark !== undefined) {
              updateFields.push('mark = ?');
              updateValues.push(finalMark || null);
            }
            
            // Only update completed_at if status is completed
            if (status === 'completed') {
              updateFields.push('completed_at = CURRENT_TIMESTAMP');
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
            dbInstance.get('SELECT template_id FROM audits WHERE id = ?', [auditId], (err, audit) => {
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
              
              dbInstance.all(
                query,
                [audit.template_id],
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

                  const total = auditItems.length;
                  const completed = auditItems.filter(item => {
                    const hasMark = item.mark !== null && item.mark !== undefined && item.mark !== '';
                    const isNA = item.mark === 'NA' || String(item.mark).toUpperCase() === 'NA';
                    return hasMark || isNA;
                  }).length;
                  const auditStatus = completed === total ? 'completed' : 'in_progress';

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
                        handleScheduledAuditCompletion(dbInstance, auditId);
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
                      
                      dbInstance.all(
                        `SELECT COUNT(*) as completed
                         FROM audit_items 
                         WHERE audit_id = ? AND (mark IS NOT NULL OR status = 'completed')`,
                        [auditId],
                        (err, completedResult) => {
                          if (!err && completedResult.length > 0) {
                            const completed = completedResult[0].completed || 0;
                            const auditStatus = completed === total ? 'completed' : 'in_progress';

                            dbInstance.run(
                              `UPDATE audits 
                               SET completed_items = ?, score = ?, status = ?, 
                                   completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
                               WHERE id = ?`,
                              [completed, score, auditStatus, completed, total, auditId],
                              function(updateErr) {
                                if (updateErr) {
                                  logger.error('Error updating audit:', updateErr.message);
                                }
                                if (auditStatus === 'completed') {
                                  handleScheduledAuditCompletion(dbInstance, auditId);
                                }
                                res.json({ message: 'Audit item updated successfully' });
                              }
                            );
                          } else {
                            res.json({ message: 'Audit item updated successfully' });
                          }
                        }
                      );
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

    try {
      // Process all items in parallel using Promise.all
      const updatePromises = items.map(item => {
        return new Promise((resolve, reject) => {
          const { status, comment, photo_url, mark } = item;
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
                dbInstance.run(
                  `INSERT INTO audit_items (audit_id, item_id, status, comment, photo_url, selected_option_id, mark) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [auditId, itemId, status || 'pending', comment || null, photo_url || null, selected_option_id, mark || null],
                  function(err) {
                    if (err) return reject(err);
                    resolve({ itemId, action: 'inserted' });
                  }
                );
              } else {
                // Update existing item
                const updateFields = ['status = ?', 'comment = ?', 'photo_url = ?'];
                const updateValues = [status || 'pending', comment || null, photo_url || null];
                
                if (selected_option_id !== undefined) {
                  updateFields.push('selected_option_id = ?');
                  updateValues.push(selected_option_id || null);
                }
                if (mark !== undefined) {
                  updateFields.push('mark = ?');
                  updateValues.push(mark || null);
                }
                if (status === 'completed') {
                  updateFields.push('completed_at = CURRENT_TIMESTAMP');
                }
                
                updateValues.push(auditId, itemId);
                
                dbInstance.run(
                  `UPDATE audit_items SET ${updateFields.join(', ')} WHERE audit_id = ? AND item_id = ?`,
                  updateValues,
                  function(err) {
                    if (err) return reject(err);
                    resolve({ itemId, action: 'updated' });
                  }
                );
              }
            }
          );
        });
      });

      await Promise.all(updatePromises);

      // Calculate score once after all updates
      calculateAndUpdateScore(dbInstance, auditId, audit.template_id, (err, scoreData) => {
        if (err) {
          logger.error('Error calculating score:', err.message);
        }
        
        if (scoreData && scoreData.status === 'completed') {
          handleScheduledAuditCompletion(dbInstance, auditId);
        }
        
        res.json({ 
          message: 'Audit items updated successfully', 
          updatedCount: items.length,
          score: scoreData?.score,
          status: scoreData?.status
        });
      });

    } catch (error) {
      logger.error('Error in batch update:', error.message);
      res.status(500).json({ error: 'Error updating audit items' });
    }
  });
});

// Helper function to calculate and update audit score
function calculateAndUpdateScore(dbInstance, auditId, templateId, callback) {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  // Get all audit items with their marks
  dbInstance.all(
    `SELECT ai.item_id, ai.mark FROM audit_items ai WHERE ai.audit_id = ?`,
    [auditId],
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

      dbInstance.all(query, [templateId], (err, templateItems) => {
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

        const total = auditItems.length;
        const completed = auditItems.filter(item => {
          const hasMark = item.mark !== null && item.mark !== undefined && item.mark !== '';
          return hasMark;
        }).length;
        
        const auditStatus = completed === total && total > 0 ? 'completed' : 'in_progress';

        dbInstance.run(
          `UPDATE audits 
           SET completed_items = ?, score = ?, status = ?, 
               completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
           WHERE id = ?`,
          [completed, score, auditStatus, completed, total, auditId],
          function(err) {
            if (err) return callback(err);
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

            handleScheduledAuditCompletion(dbInstance, auditId);

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

            res.json({ message: 'Audit completed successfully', score });
          }
        );
      }
    );
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

module.exports = router;

