const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { isAdminUser } = require('../middleware/permissions');

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
        console.error('Error updating scheduled audit status to in_progress:', err);
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
        console.error('Error fetching audit for schedule completion:', err);
        return;
      }
      if (!auditRow || !auditRow.scheduled_audit_id) {
        return;
      }

      const scheduleId = auditRow.scheduled_audit_id;
      dbInstance.get(
        'SELECT id, frequency, scheduled_date FROM scheduled_audits WHERE id = ?',
        [scheduleId],
        (scheduleErr, schedule) => {
          if (scheduleErr) {
            console.error('Error fetching scheduled audit for completion:', scheduleErr);
            return;
          }
          if (!schedule) return;

          if (!schedule.frequency || schedule.frequency === 'once') {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ? WHERE id = ?',
              ['completed', scheduleId],
              (updateErr) => {
                if (updateErr) {
                  console.error('Error marking scheduled audit as completed:', updateErr);
                }
              }
            );
          } else if (schedule.status === 'in_progress') {
            const nextDate = getNextScheduledDate(schedule.scheduled_date, schedule.frequency);
            if (!nextDate) {
              dbInstance.run(
                'UPDATE scheduled_audits SET status = ? WHERE id = ?',
                ['pending', scheduleId],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error resetting scheduled audit status:', updateErr);
                  }
                }
              );
            } else {
              dbInstance.run(
                'UPDATE scheduled_audits SET status = ?, scheduled_date = ?, next_run_date = ? WHERE id = ?',
                ['pending', nextDate, nextDate, scheduleId],
                (updateErr) => {
                  if (updateErr) {
                    console.error('Error advancing scheduled audit date:', updateErr);
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
  const { status, restaurant, template_id, date_from, date_to, min_score, max_score } = req.query;

  let query = `SELECT a.*, ct.name as template_name, ct.category, 
               l.name as location_name, l.store_number,
               u.name as user_name, u.email as user_email
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN locations l ON a.location_id = l.id
               LEFT JOIN users u ON a.user_id = u.id`;
  
  // Admins see all audits, regular users only see their own
  let params = [];
  if (isAdmin) {
    query += ` WHERE 1=1`;
  } else {
    query += ` WHERE a.user_id = ?`;
    params = [userId];
  }

  // Apply filters
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (restaurant) {
    query += ' AND a.restaurant_name LIKE ?';
    params.push(`%${restaurant}%`);
  }
  if (template_id) {
    query += ' AND a.template_id = ?';
    params.push(template_id);
  }
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }
  if (min_score !== undefined) {
    query += ' AND a.score >= ?';
    params.push(min_score);
  }
  if (max_score !== undefined) {
    query += ' AND a.score <= ?';
    params.push(max_score);
  }

  query += ' ORDER BY a.created_at DESC';

  dbInstance.all(query, params, (err, audits) => {
    if (err) {
      console.error('Error fetching audits:', err);
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ audits: audits || [] });
  });
});

// Get audit by scheduled_audit_id
router.get('/by-scheduled/:scheduledId', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const scheduledId = req.params.scheduledId;
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
      console.error('Error fetching audit by scheduled_id:', err);
      console.error('Database error:', err);
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
  const auditId = req.params.id;
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
            return res.json({ audit, items: [] });
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
              
              // Attach options to items, normalize option_text to text for compatibility
              const itemsWithOptions = items.map(item => ({
                ...item,
                options: (optionsByItem[item.item_id] || []).map(option => ({
                  ...option,
                  text: option.option_text // Add text field for mobile compatibility
                }))
              }));
              
              res.json({ audit, items: itemsWithOptions });
            }
          );
        }
      );
    }
  );
});

// Create new audit
router.post('/', authenticate, (req, res) => {
  const { template_id, restaurant_name, location, location_id, team_id, notes, scheduled_audit_id } = req.body;
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
        console.error('Error fetching permissions:', permErr);
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
            `INSERT INTO audits (template_id, user_id, restaurant_name, location, location_id, team_id, notes, total_items, scheduled_audit_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [template_id, req.user.id, restaurant_name, location || '', location_id || null, team_id || null, notes || '', totalItems, linkedSchedule ? linkedSchedule.id : null],
            function(err, result) {
              if (err) {
                console.error('Error creating audit:', err);
                console.error('Error creating audit:', err);
                return res.status(500).json({ error: 'Error creating audit' });
              }

              // Handle both SQL Server (result.lastID) and SQLite (this.lastID)
              const auditId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
              
              if (!auditId || auditId === 0) {
                console.error('Failed to get audit ID after insert');
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
                        console.error('Error creating audit item:', err);
                        console.error('Error creating audit items:', err);
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
  const auditId = req.params.id;
  const { restaurant_name, location, location_id, notes } = req.body;
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
          console.error('Error fetching permissions:', permErr);
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

// Update audit item
router.put('/:auditId/items/:itemId', authenticate, (req, res) => {
  const { auditId, itemId } = req.params;
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
          console.warn(`Selected option ${selected_option_id} not found, setting to null`);
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
            console.error('Error checking for existing audit item:', err);
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
                  console.error('Error creating audit item:', insertErr);
                  console.error('Insert query:', `INSERT INTO audit_items (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`);
                  console.error('Insert values:', insertValues);
                  console.error('Audit ID:', auditId, 'Item ID:', itemId);
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
                  console.error('Error updating audit item:', updateErr);
                  console.error('Update query:', `UPDATE audit_items SET ${updateFields.join(', ')} WHERE audit_id = ? AND item_id = ?`);
                  console.error('Update values:', updateValues);
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
        // Update audit progress - calculate score based on marks
        // First, get the actual marks from audit items (excluding N/A)
        dbInstance.all(
          `SELECT ai.item_id, ai.mark, ci.id as checklist_item_id
           FROM audit_items ai
           JOIN checklist_items ci ON ai.item_id = ci.id
           WHERE ai.audit_id = ?`,
          [auditId],
          (err, auditItems) => {
            if (err) {
              console.error('Error fetching audit items:', err);
              return res.json({ message: 'Audit item updated successfully' });
            }

            // Get total possible score from template (sum of "Yes" option marks, excluding N/A items)
            dbInstance.get('SELECT template_id FROM audits WHERE id = ?', [auditId], (err, audit) => {
              if (err || !audit) {
                console.error('Error fetching audit:', err);
                return res.json({ message: 'Audit item updated successfully' });
              }

              // Get all checklist items for this template with their "Yes" option marks
              // Use database-agnostic query
              const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
              let query;
              if (dbType === 'mssql' || dbType === 'sqlserver') {
                // SQL Server: Use TOP in subquery
                query = `SELECT ci.id, 
                         (SELECT TOP 1 CAST(cio.mark AS FLOAT)
                          FROM checklist_item_options cio 
                          WHERE cio.item_id = ci.id AND cio.option_text = 'Yes') as max_score
                         FROM checklist_items ci
                         WHERE ci.template_id = ?`;
              } else {
                // SQLite, PostgreSQL, MySQL: Use LIMIT
                query = `SELECT ci.id, 
                         (SELECT CAST(cio.mark AS REAL)
                          FROM checklist_item_options cio 
                          WHERE cio.item_id = ci.id AND cio.option_text = 'Yes' 
                          LIMIT 1) as max_score
                         FROM checklist_items ci
                         WHERE ci.template_id = ?`;
              }
              
              dbInstance.all(
                query,
                [audit.template_id],
                (err, templateItems) => {
                  if (err) {
                    console.error('Error fetching template items:', err);
                    // Fallback to old calculation
                    return calculateScoreFallback();
                  }

                  // Calculate total possible score (sum of max scores from template)
                  let totalPossibleScore = 0;
                  templateItems.forEach(item => {
                    if (item.max_score !== null) {
                      totalPossibleScore += parseFloat(item.max_score) || 0;
                    }
                  });

                  // Calculate actual score (sum of marks, excluding N/A)
                  let actualScore = 0;
                  let itemsWithMarks = 0;
                  auditItems.forEach(item => {
                    if (item.mark && item.mark !== 'NA') {
                      actualScore += parseFloat(item.mark) || 0;
                      itemsWithMarks++;
                    }
                  });

                  // Calculate percentage: (actual / total possible) * 100
                  const score = totalPossibleScore > 0 
                    ? Math.round((actualScore / totalPossibleScore) * 100) 
                    : 0;

                  const total = auditItems.length;
                  const completed = auditItems.filter(item => item.mark !== null && item.mark !== undefined).length;
                  const auditStatus = completed === total ? 'completed' : 'in_progress';

                  dbInstance.run(
                    `UPDATE audits 
                     SET completed_items = ?, score = ?, status = ?, 
                         completed_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE completed_at END
                     WHERE id = ?`,
                    [completed, score, auditStatus, completed, total, auditId],
                    function(updateErr) {
                      if (updateErr) {
                        console.error('Error updating audit:', updateErr);
                      }
                      if (auditStatus === 'completed') {
                        handleScheduledAuditCompletion(dbInstance, auditId);
                      }
                      res.json({ message: 'Audit item updated successfully' });
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
                                  console.error('Error updating audit:', updateErr);
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

// Complete audit
router.put('/:id/complete', authenticate, (req, res) => {
  const auditId = req.params.id;
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
              console.error('Error creating completion notification:', notifErr);
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
  const auditId = req.params.id;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { requirePermission, getUserPermissions, hasPermission } = require('../middleware/permissions');
  const isAdmin = isAdminUser(req.user);

  // Check permissions first
  getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
    if (permErr) {
      console.error('Error fetching permissions:', permErr);
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

