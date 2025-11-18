const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// Create action plan from audit item or standalone
router.post('/', authenticate, (req, res) => {
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
    async function(err) {
      if (err) {
        console.error('Error creating action item:', err);
        return res.status(500).json({ error: 'Error creating action item', details: err.message });
      }

      const actionItemId = this.lastID;

      // Send notification to assigned user
      if (assigned_to) {
        try {
          await createNotification(
            assigned_to,
            'action',
            'New Action Item Assigned',
            `Action item "${title}" has been assigned to you${due_date ? ` (Due: ${new Date(due_date).toLocaleDateString()})` : ''}`,
            `/actions`
          );
        } catch (notifErr) {
          console.error('Error creating notification:', notifErr);
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
                console.error('Error creating notification to audit creator:', notifErr);
              }
            }
          });
        } catch (err) {
          console.error('Error fetching audit:', err);
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
        console.error('Error fetching action items:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ actions: actions || [] });
    }
  );
});

// Get all action items for current user
router.get('/', authenticate, (req, res) => {
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
      console.error('Error fetching action items:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ actions: actions || [] });
  });
});

// Update action item
router.put('/:id', authenticate, async (req, res) => {
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
            console.error('Error creating completion notification:', notifErr);
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
            console.error('Error creating reassignment notification:', notifErr);
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
              async function(taskErr) {
                if (!taskErr && this.lastID) {
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
                      console.error('Error creating task notification:', notifErr);
                    }
                  }
                }
              }
            );
          } catch (taskErr) {
            console.error('Error creating task from action item:', taskErr);
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
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();

  dbInstance.run('DELETE FROM action_items WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting action item' });
    }
    res.json({ message: 'Action item deleted successfully' });
  });
});

module.exports = router;

