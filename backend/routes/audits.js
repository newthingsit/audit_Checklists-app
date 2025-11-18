const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');

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

// Get all audits for current user with filters
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { status, restaurant, template_id, date_from, date_to, min_score, max_score } = req.query;

  let query = `SELECT a.*, ct.name as template_name, ct.category
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     WHERE a.user_id = ?`;
  
  const params = [userId];

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
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ audits });
  });
});

// Get single audit with items
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const auditId = req.params.id;
  const userId = req.user.id;

  dbInstance.get(
    `SELECT a.*, ct.name as template_name, ct.category
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     WHERE a.id = ? AND a.user_id = ?`,
    [auditId, userId],
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
              
              // Attach options to items
              const itemsWithOptions = items.map(item => ({
                ...item,
                options: optionsByItem[item.item_id] || []
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

  if (!template_id || !restaurant_name) {
    return res.status(400).json({ error: 'Template ID and restaurant name are required' });
  }

  const validateScheduledAudit = (callback) => {
    if (!scheduled_audit_id) {
      return callback(null, null);
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
                return res.status(500).json({ error: 'Error creating audit', details: err.message });
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
                        return res.status(500).json({ error: 'Error creating audit items', details: err.message });
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

// Update audit item
router.put('/:auditId/items/:itemId', authenticate, (req, res) => {
  const { auditId, itemId } = req.params;
  const { status, comment, photo_url, selected_option_id, mark } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Verify audit belongs to user
  dbInstance.get('SELECT * FROM audits WHERE id = ? AND user_id = ?', [auditId, userId], (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    // If selected_option_id is provided, get the mark from the option
    let finalMark = mark;
    if (selected_option_id) {
      dbInstance.get('SELECT mark FROM checklist_item_options WHERE id = ?', [selected_option_id], (err, option) => {
        if (!err && option) {
          finalMark = option.mark;
        }
        updateAuditItem();
      });
    } else {
      updateAuditItem();
    }

    function updateAuditItem() {
      // Update audit item
      const updateFields = ['status = ?', 'comment = ?', 'photo_url = ?', 'completed_at = CURRENT_TIMESTAMP'];
      const updateValues = [status, comment || null, photo_url || null];
      
      if (selected_option_id !== undefined) {
        updateFields.push('selected_option_id = ?');
        updateValues.push(selected_option_id || null);
      }
      
      if (finalMark !== undefined) {
        updateFields.push('mark = ?');
        updateValues.push(finalMark || null);
      }
      
      updateValues.push(auditId, itemId);
      
      dbInstance.run(
        `UPDATE audit_items 
         SET ${updateFields.join(', ')}
         WHERE audit_id = ? AND item_id = ?`,
        updateValues,
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating audit item' });
          }

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
          );
        }
      );
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
                `/audits/${auditId}`
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

  // Verify audit belongs to user
  dbInstance.get('SELECT * FROM audits WHERE id = ? AND user_id = ?', [auditId, userId], (err, audit) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
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

// Bulk delete audits
router.post('/bulk-delete', authenticate, (req, res) => {
  const { auditIds } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  if (!auditIds || !Array.isArray(auditIds) || auditIds.length === 0) {
    return res.status(400).json({ error: 'Audit IDs are required' });
  }

  // Verify all audits belong to user
  const placeholders = auditIds.map(() => '?').join(',');
  dbInstance.all(
    `SELECT id FROM audits WHERE id IN (${placeholders}) AND user_id = ?`,
    [...auditIds, userId],
    (err, validAudits) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (validAudits.length !== auditIds.length) {
        return res.status(403).json({ error: 'Some audits do not belong to you' });
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
    }
  );
});

module.exports = router;

