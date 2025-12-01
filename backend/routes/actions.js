const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission, isAdminUser } = require('../middleware/permissions');
const { createNotification } = require('./notifications');
const logger = require('../utils/logger');

const router = express.Router();

// Create action plan from audit item or standalone
router.post('/', authenticate, requirePermission('manage_actions', 'create_actions'), (req, res) => {
  const { audit_id, item_id, title, description, assigned_to, due_date, priority } = req.body;
  const dbInstance = db.getDb();

  // Title is required, but audit_id and item_id are optional (for standalone action items)
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  dbInstance.run(
    `INSERT INTO action_items (audit_id, item_id, title, description, assigned_to, due_date, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [audit_id || null, item_id || null, title, description || '', assigned_to || null, due_date || null, priority || 'medium'],
    async function(err, result) {
      if (err) {
        logger.error('Error creating action item:', err);
        return res.status(500).json({ error: 'Error creating action item', details: err.message });
      }

      // Handle both SQL Server (result.lastID) and SQLite/MySQL/PostgreSQL (this.lastID)
      const actionItemId = (result && result.lastID !== undefined) ? result.lastID : (this.lastID || 0);
      
      if (!actionItemId || actionItemId === 0) {
        logger.error('Failed to get action item ID after insert');
        return res.status(500).json({ error: 'Failed to create action item - no ID returned' });
      }

      // Send notification to assigned user
      if (assigned_to) {
        try {
          // Get user name for email
          dbInstance.get('SELECT name FROM users WHERE id = ?', [assigned_to], async (err, user) => {
            await createNotification(
              assigned_to,
              'action',
              'New Action Item Assigned',
              `Action item "${title}" has been assigned to you${due_date ? ` (Due: ${new Date(due_date).toLocaleDateString()})` : ''}`,
              `/actions`,
              {
                template: 'actionItemAssigned',
                data: [title, due_date, priority || 'medium']
              }
            );
          });
        } catch (notifErr) {
          logger.error('Error creating notification:', notifErr);
          // Don't fail the request if notification fails
        }
      }

      // Send notification to audit creator if different from assignee
      if (audit_id && assigned_to && assigned_to !== req.user.id) {
        try {
          dbInstance.get('SELECT user_id FROM audits WHERE id = ?', [audit_id], async (err, audit) => {
            if (!err && audit && audit.user_id !== assigned_to) {
              try {
                await createNotification(
                  audit.user_id,
                  'action',
                  'Action Item Created',
                  `Action item "${title}" was created from your audit and assigned to another user`,
                  `/audits/${audit_id}`
                );
              } catch (notifErr) {
                logger.error('Error creating notification to audit creator:', notifErr);
              }
            }
          });
        } catch (err) {
          logger.error('Error fetching audit:', err);
        }
      }

      res.status(201).json({ id: actionItemId, message: 'Action item created successfully' });
    }
  );
});

// Get action items for an audit
router.get('/audit/:auditId', authenticate, (req, res) => {
  const { auditId } = req.params;
  const dbInstance = db.getDb();

  dbInstance.all(
    `SELECT ai.*, u.name as assigned_to_name
     FROM action_items ai
     LEFT JOIN users u ON ai.assigned_to = u.id
     WHERE ai.audit_id = ?
     ORDER BY ai.priority DESC, ai.due_date ASC`,
    [auditId],
    (err, actions) => {
      if (err) {
        logger.error('Error fetching action items:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ actions: actions || [] });
    }
  );
});

// Get all action items for current user
router.get('/', authenticate, requirePermission('view_actions', 'manage_actions'), (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { status, priority } = req.query;

  // Use LEFT JOIN to include standalone action items (where audit_id is NULL)
  let query = `SELECT ai.*, a.restaurant_name, ci.title as item_title
     FROM action_items ai
     LEFT JOIN audits a ON ai.audit_id = a.id
     LEFT JOIN checklist_items ci ON ai.item_id = ci.id
     WHERE (ai.assigned_to = ? OR a.user_id = ? OR (ai.audit_id IS NULL AND ai.assigned_to IS NULL))`;
  
  const params = [userId, userId];

  if (status) {
    query += ' AND ai.status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND ai.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY ai.due_date ASC, ai.priority DESC';

  dbInstance.all(query, params, (err, actions) => {
    if (err) {
      logger.error('Error fetching action items:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ actions: actions || [] });
  });
});

// Update action item
router.put('/:id', authenticate, requirePermission('manage_actions', 'update_actions'), async (req, res) => {
  const { id } = req.params;
  const { status, title, description, assigned_to, due_date, priority, notes, auto_create_task } = req.body;
  const dbInstance = db.getDb();

  // Get current action item
  dbInstance.get('SELECT * FROM action_items WHERE id = ?', [id], async (err, currentAction) => {
    if (err || !currentAction) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    const updates = [];
    const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }
  if (due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(due_date);
  }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    // Note: notes column doesn't exist in schema, removing it

    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (updates.length === 0 && !auto_create_task) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    dbInstance.run(
      `UPDATE action_items SET ${updates.join(', ')} WHERE id = ?`,
      params,
      async function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating action item' });
        }

        // Send notifications for status changes
        if (status && status === 'completed' && currentAction.status !== 'completed') {
          // Notify creator/assigner
          try {
            await createNotification(
              req.user.id,
              'action',
              'Action Item Completed',
              `Action item "${currentAction.title}" has been marked as completed`,
              `/actions`
            );
          } catch (notifErr) {
            logger.error('Error creating completion notification:', notifErr);
          }
        }

        // Send notification if assignment changed
        if (assigned_to !== undefined && assigned_to !== currentAction.assigned_to && assigned_to) {
          try {
            await createNotification(
              assigned_to,
              'action',
              'Action Item Reassigned',
              `Action item "${currentAction.title}" has been reassigned to you`,
              `/actions`
            );
          } catch (notifErr) {
            logger.error('Error creating reassignment notification:', notifErr);
          }
        }

        // Auto-create task if requested
        if (auto_create_task) {
          try {
            dbInstance.run(
              `INSERT INTO tasks (title, description, type, priority, assigned_to, action_item_id, due_date, created_by, status)
               VALUES (?, ?, 'action_followup', ?, ?, ?, ?, ?, 'pending')`,
              [
                currentAction.title,
                currentAction.description || '',
                currentAction.priority || 'medium',
                currentAction.assigned_to || req.user.id,
                id,
                currentAction.due_date || null,
                req.user.id
              ],
              async function(taskErr, taskResult) {
                // Handle both SQL Server (result.lastID) and SQLite/MySQL/PostgreSQL (this.lastID)
                const taskId = (taskResult && taskResult.lastID !== undefined) ? taskResult.lastID : (this.lastID || 0);
                if (!taskErr && taskId) {
                  // Update action item to link to task
                  dbInstance.run(
                    'UPDATE action_items SET status = ? WHERE id = ?',
                    ['in_progress', id],
                    () => {}
                  );

                  // Notify assigned user about new task
                  if (currentAction.assigned_to) {
                    try {
                      await createNotification(
                        currentAction.assigned_to,
                        'task',
                        'Task Created from Action Item',
                        `Task "${currentAction.title}" has been created from your action item`,
                        `/tasks`
                      );
                    } catch (notifErr) {
                      logger.error('Error creating task notification:', notifErr);
                    }
                  }
                }
              }
            );
          } catch (taskErr) {
            logger.error('Error creating task from action item:', taskErr);
          }
        }

        // Sync with linked task if action item is completed
        if (status === 'completed') {
          dbInstance.all(
            'SELECT id FROM tasks WHERE action_item_id = ? AND status != ?',
            [id, 'completed'],
            async (err, linkedTasks) => {
              if (!err && linkedTasks && linkedTasks.length > 0) {
                linkedTasks.forEach(task => {
                  dbInstance.run(
                    'UPDATE tasks SET status = ? WHERE id = ?',
                    ['completed', task.id],
                    () => {}
                  );
                });
              }
            }
          );
        }

        res.json({ message: 'Action item updated successfully' });
      }
    );
  });
});

// Delete action item
router.delete('/:id', authenticate, requirePermission('manage_actions', 'delete_actions'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();

  dbInstance.run('DELETE FROM action_items WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting action item' });
    }
    res.json({ message: 'Action item deleted successfully' });
  });
});

// ========================================
// ENHANCED ACTION PLAN FEATURES
// ========================================

// Get action item details with comments and attachments
router.get('/:id/details', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  
  dbInstance.get(
    `SELECT a.*, 
     u1.name as assigned_to_name, 
     u2.name as escalated_to_name,
     au.restaurant_name as audit_name,
     ci.title as item_title
     FROM action_items a
     LEFT JOIN users u1 ON a.assigned_to = u1.id
     LEFT JOIN users u2 ON a.escalated_to = u2.id
     LEFT JOIN audits au ON a.audit_id = au.id
     LEFT JOIN checklist_items ci ON a.item_id = ci.id
     WHERE a.id = ?`,
    [id],
    (err, action) => {
      if (err || !action) {
        return res.status(404).json({ error: 'Action item not found' });
      }
      
      // Get comments
      dbInstance.all(
        `SELECT ac.*, u.name as user_name 
         FROM action_comments ac
         LEFT JOIN users u ON ac.user_id = u.id
         WHERE ac.action_id = ?
         ORDER BY ac.created_at DESC`,
        [id],
        (err, comments) => {
          // Get attachments
          dbInstance.all(
            `SELECT aa.*, u.name as uploaded_by_name
             FROM action_attachments aa
             LEFT JOIN users u ON aa.uploaded_by = u.id
             WHERE aa.action_id = ?
             ORDER BY aa.uploaded_at DESC`,
            [id],
            (err, attachments) => {
              res.json({
                action,
                comments: comments || [],
                attachments: attachments || []
              });
            }
          );
        }
      );
    }
  );
});

// Add comment to action item
router.post('/:id/comments', authenticate, (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const dbInstance = db.getDb();
  
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }
  
  dbInstance.run(
    `INSERT INTO action_comments (action_id, user_id, comment) VALUES (?, ?, ?)`,
    [id, req.user.id, comment.trim()],
    function(err) {
      if (err) {
        logger.error('Error adding comment:', err);
        return res.status(500).json({ error: 'Error adding comment' });
      }
      
      // Notify action item owner
      dbInstance.get('SELECT assigned_to, title FROM action_items WHERE id = ?', [id], async (err, action) => {
        if (action && action.assigned_to && action.assigned_to !== req.user.id) {
          try {
            await createNotification(
              action.assigned_to,
              'action',
              'New Comment on Action Item',
              `${req.user.name} commented on "${action.title}"`,
              `/actions`
            );
          } catch (e) {
            // Ignore notification errors
          }
        }
      });
      
      res.status(201).json({ 
        id: this.lastID, 
        message: 'Comment added successfully' 
      });
    }
  );
});

// Delete comment
router.delete('/:id/comments/:commentId', authenticate, (req, res) => {
  const { id, commentId } = req.params;
  const dbInstance = db.getDb();
  
  // Only comment author or admin can delete
  dbInstance.get('SELECT * FROM action_comments WHERE id = ? AND action_id = ?', [commentId, id], (err, comment) => {
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    
    dbInstance.run('DELETE FROM action_comments WHERE id = ?', [commentId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting comment' });
      }
      res.json({ message: 'Comment deleted successfully' });
    });
  });
});

// Escalate action item
router.post('/:id/escalate', authenticate, requirePermission('manage_actions', 'update_actions'), (req, res) => {
  const { id } = req.params;
  const { escalate_to, reason } = req.body;
  const dbInstance = db.getDb();
  
  if (!escalate_to) {
    return res.status(400).json({ error: 'Escalation target is required' });
  }
  
  dbInstance.run(
    `UPDATE action_items SET escalated = 1, escalated_to = ?, escalated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [escalate_to, id],
    async function(err) {
      if (err) {
        logger.error('Error escalating action:', err);
        return res.status(500).json({ error: 'Error escalating action item' });
      }
      
      // Add escalation comment
      if (reason) {
        dbInstance.run(
          `INSERT INTO action_comments (action_id, user_id, comment) VALUES (?, ?, ?)`,
          [id, req.user.id, `[ESCALATED] ${reason}`]
        );
      }
      
      // Notify the person being escalated to
      dbInstance.get('SELECT title FROM action_items WHERE id = ?', [id], async (err, action) => {
        if (action) {
          try {
            await createNotification(
              escalate_to,
              'action',
              'Action Item Escalated to You',
              `Action item "${action.title}" has been escalated to you${reason ? `: ${reason}` : ''}`,
              `/actions`
            );
          } catch (e) {
            // Ignore notification errors
          }
        }
      });
      
      res.json({ message: 'Action item escalated successfully' });
    }
  );
});

// Update root cause and corrective action
router.put('/:id/analysis', authenticate, requirePermission('manage_actions', 'update_actions'), (req, res) => {
  const { id } = req.params;
  const { root_cause, corrective_action, category } = req.body;
  const dbInstance = db.getDb();
  
  const updates = [];
  const params = [];
  
  if (root_cause !== undefined) {
    updates.push('root_cause = ?');
    params.push(root_cause);
  }
  if (corrective_action !== undefined) {
    updates.push('corrective_action = ?');
    params.push(corrective_action);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  params.push(id);
  
  dbInstance.run(
    `UPDATE action_items SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        logger.error('Error updating analysis:', err);
        return res.status(500).json({ error: 'Error updating analysis' });
      }
      res.json({ message: 'Analysis updated successfully' });
    }
  );
});

// Get action items analytics/report
router.get('/analytics/summary', authenticate, requirePermission('view_analytics', 'manage_actions'), (req, res) => {
  const dbInstance = db.getDb();
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  const params = [];
  
  if (start_date) {
    dateFilter += ' AND a.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateFilter += ' AND a.created_at <= ?';
    params.push(end_date);
  }
  
  // Get summary stats
  dbInstance.get(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalated,
      SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND status != 'completed' THEN 1 ELSE 0 END) as overdue
     FROM action_items a
     WHERE 1=1 ${dateFilter}`,
    params,
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get by priority
      dbInstance.all(
        `SELECT priority, COUNT(*) as count 
         FROM action_items a
         WHERE 1=1 ${dateFilter}
         GROUP BY priority`,
        params,
        (err, byPriority) => {
          // Get by category
          dbInstance.all(
            `SELECT COALESCE(category, 'Uncategorized') as category, COUNT(*) as count 
             FROM action_items a
             WHERE 1=1 ${dateFilter}
             GROUP BY category`,
            params,
            (err, byCategory) => {
              // Get by assignee
              dbInstance.all(
                `SELECT u.name as assignee, COUNT(*) as count,
                 SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed
                 FROM action_items a
                 LEFT JOIN users u ON a.assigned_to = u.id
                 WHERE 1=1 ${dateFilter}
                 GROUP BY a.assigned_to, u.name`,
                params,
                (err, byAssignee) => {
                  res.json({
                    summary: summary || {},
                    byPriority: byPriority || [],
                    byCategory: byCategory || [],
                    byAssignee: byAssignee || []
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get overdue action items
router.get('/overdue', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  
  let query = `
    SELECT a.*, u.name as assigned_to_name, au.restaurant_name as audit_name
    FROM action_items a
    LEFT JOIN users u ON a.assigned_to = u.id
    LEFT JOIN audits au ON a.audit_id = au.id
    WHERE a.due_date < CURRENT_TIMESTAMP 
    AND a.status != 'completed'
  `;
  
  const params = [];
  if (req.user.role !== 'admin') {
    query += ' AND a.assigned_to = ?';
    params.push(userId);
  }
  
  query += ' ORDER BY a.due_date ASC';
  
  dbInstance.all(query, params, (err, actions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ actions: actions || [] });
  });
});

module.exports = router;

