const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission, isAdminUser } = require('../middleware/permissions');
const { createNotification } = require('./notifications');

const router = express.Router();

// Get all tasks for current user
router.get('/', authenticate, requirePermission('view_tasks', 'manage_tasks'), (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { status, priority, type, assigned_to } = req.query;

  let query = `SELECT t.*, 
    u1.name as assigned_to_name,
    u2.name as created_by_name,
    l.name as location_name,
    a.restaurant_name as audit_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    LEFT JOIN locations l ON t.location_id = l.id
    LEFT JOIN audits a ON t.audit_id = a.id`;

  const params = [];
  
  // Admins can see all tasks, others only see their own
  if (req.user.role === 'admin') {
    query += ' WHERE 1=1';
  } else {
    query += ' WHERE (t.assigned_to = ? OR t.created_by = ?)';
    params.push(userId, userId);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }
  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }
  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC';

  dbInstance.all(query, params, (err, tasks) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Get dependencies for each task
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) {
      return res.json({ tasks: [] });
    }

    dbInstance.all(
      `SELECT td.task_id, td.depends_on_task_id, t.title as depends_on_title
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id IN (${taskIds.map(() => '?').join(',')})`,
      taskIds,
      (err, dependencies) => {
        if (err) {
          console.error('Error fetching dependencies:', err);
          return res.json({ tasks });
        }

        // Group dependencies by task_id
        const depsByTask = {};
        dependencies.forEach(dep => {
          if (!depsByTask[dep.task_id]) {
            depsByTask[dep.task_id] = [];
          }
          depsByTask[dep.task_id].push({
            id: dep.depends_on_task_id,
            title: dep.depends_on_title
          });
        });

        // Add dependencies to tasks
        tasks.forEach(task => {
          task.dependencies = depsByTask[task.id] || [];
        });

        res.json({ tasks });
      }
    );
  });
});

// Get dependency options for tasks (used in UI dropdown)
router.get('/dependencies/options', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const getTeamIds = () => {
    return new Promise((resolve, reject) => {
      if (isAdmin) {
        return resolve([]);
      }
      dbInstance.all(
        'SELECT team_id FROM team_members WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows ? rows.map(row => row.team_id).filter(Boolean) : []);
        }
      );
    });
  };

  getTeamIds()
    .then((teamIds) => {
      let query = `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_by, t.assigned_to, t.team_id
                   FROM tasks t`;
      const params = [];
      const conditions = [];

      if (isAdmin) {
        conditions.push('1=1');
      } else {
        const ownershipConditions = ['t.created_by = ?', 't.assigned_to = ?'];
        params.push(userId, userId);
        if (teamIds.length > 0) {
          ownershipConditions.push(`t.team_id IN (${teamIds.map(() => '?').join(',')})`);
          params.push(...teamIds);
        }
        conditions.push(`(${ownershipConditions.join(' OR ')})`);
      }

      conditions.push('t.status != ?');
      params.push('completed');

      query += ` WHERE ${conditions.join(' AND ')} ORDER BY t.created_at DESC`;

      dbInstance.all(query, params, (err, tasks) => {
        if (err) {
          console.error('Error fetching dependency task options:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json({ tasks: tasks || [] });
      });
    })
    .catch((error) => {
      console.error('Error fetching dependency task options:', error);
      res.status(500).json({ error: 'Database error', details: error.message });
    });
});

// Get single task
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  const whereClause = req.user.role === 'admin' 
    ? 'WHERE t.id = ?'
    : 'WHERE t.id = ? AND (t.assigned_to = ? OR t.created_by = ?)';
  const params = req.user.role === 'admin' 
    ? [req.params.id]
    : [req.params.id, userId, userId];

  dbInstance.get(
    `SELECT t.*, 
     u1.name as assigned_to_name,
     u2.name as created_by_name,
     l.name as location_name,
     a.restaurant_name as audit_name
     FROM tasks t
     LEFT JOIN users u1 ON t.assigned_to = u1.id
     LEFT JOIN users u2 ON t.created_by = u2.id
     LEFT JOIN locations l ON t.location_id = l.id
     LEFT JOIN audits a ON t.audit_id = a.id
     ${whereClause}`,
    params,
    (err, task) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Get dependencies
      dbInstance.all(
        `SELECT td.depends_on_task_id, t.title as depends_on_title, t.status as depends_on_status
         FROM task_dependencies td
         JOIN tasks t ON td.depends_on_task_id = t.id
         WHERE td.task_id = ?`,
        [task.id],
        (err, dependencies) => {
          if (!err) {
            task.dependencies = dependencies || [];
          }
          res.json({ task });
        }
      );
    }
  );
});

// Create task
router.post('/', authenticate, requirePermission('manage_tasks', 'create_tasks'), (req, res) => {
  const {
    title,
    description,
    type,
    priority,
    assigned_to,
    team_id,
    due_date,
    reminder_date,
    workflow_id,
    depends_on_task_id,
    location_id,
    audit_id,
    metadata,
    dependency_ids
  } = req.body;

  const dbInstance = db.getDb();

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const { action_item_id } = req.body;
  
  dbInstance.run(
    `INSERT INTO tasks (title, description, type, priority, assigned_to, team_id, action_item_id, due_date, reminder_date, workflow_id, depends_on_task_id, location_id, audit_id, metadata, created_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      title,
      description || '',
      type || 'general',
      priority || 'medium',
      assigned_to || null,
      team_id || null,
      action_item_id || null,
      due_date || null,
      reminder_date || null,
      workflow_id || null,
      depends_on_task_id || null,
      location_id || null,
      audit_id || null,
      metadata ? JSON.stringify(metadata) : null,
      req.user.id
    ],
    async function(err) {
      if (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'Error creating task', details: err.message });
      }

      const taskId = this.lastID;

      // Send notification to assigned user
      if (assigned_to) {
        try {
          await createNotification(
            assigned_to,
            'task',
            'New Task Assigned',
            `Task "${title}" has been assigned to you${due_date ? ` (Due: ${new Date(due_date).toLocaleDateString()})` : ''}`,
            `/tasks`
          );
        } catch (notifErr) {
          console.error('Error creating notification:', notifErr);
        }
      }

      // If created from action item, update action item status
      if (action_item_id) {
        dbInstance.run(
          'UPDATE action_items SET status = ? WHERE id = ?',
          ['in_progress', action_item_id],
          () => {}
        );
      }

      // Add multiple dependencies if provided
      if (dependency_ids && Array.isArray(dependency_ids) && dependency_ids.length > 0) {
        const depInserts = dependency_ids.map(depId => {
          return new Promise((resolve, reject) => {
            dbInstance.run(
              'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
              [taskId, depId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(depInserts)
          .then(() => {
            res.status(201).json({ id: taskId, message: 'Task created successfully' });
          })
          .catch((err) => {
            console.error('Error adding dependencies:', err);
            res.status(201).json({ id: taskId, message: 'Task created but dependencies failed', warning: true });
          });
      } else {
        res.status(201).json({ id: taskId, message: 'Task created successfully' });
      }
    }
  );
});

// Update task
router.put('/:id', authenticate, requirePermission('manage_tasks', 'update_tasks'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    type,
    status,
    priority,
    assigned_to,
    due_date,
    reminder_date,
    workflow_id,
    depends_on_task_id,
    location_id,
    audit_id,
    metadata,
    dependency_ids
  } = req.body;

  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Check if task exists and user has permission
  const whereClause = req.user.role === 'admin'
    ? 'SELECT * FROM tasks WHERE id = ?'
    : 'SELECT * FROM tasks WHERE id = ? AND (assigned_to = ? OR created_by = ?)';
  const checkParams = req.user.role === 'admin'
    ? [id]
    : [id, userId, userId];

  dbInstance.get(
    whereClause,
    checkParams,
    (err, task) => {
      if (err || !task) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      const updates = [];
      const params = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'completed') {
          updates.push('completed_at = CURRENT_TIMESTAMP');
        } else if (status !== 'completed' && task.status === 'completed') {
          updates.push('completed_at = NULL');
        }
      }
      if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
      }
      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
      }
      if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(due_date);
      }
      if (reminder_date !== undefined) {
        updates.push('reminder_date = ?');
        params.push(reminder_date);
      }
      if (workflow_id !== undefined) {
        updates.push('workflow_id = ?');
        params.push(workflow_id);
      }
      if (depends_on_task_id !== undefined) {
        updates.push('depends_on_task_id = ?');
        params.push(depends_on_task_id);
      }
      if (location_id !== undefined) {
        updates.push('location_id = ?');
        params.push(location_id);
      }
      if (audit_id !== undefined) {
        updates.push('audit_id = ?');
        params.push(audit_id);
      }
      if (metadata !== undefined) {
        updates.push('metadata = ?');
        params.push(metadata ? JSON.stringify(metadata) : null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);

      dbInstance.run(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        params,
        async function(err) {
          if (err) {
            console.error('Error updating task:', err);
            return res.status(500).json({ error: 'Error updating task' });
          }

          // Send notifications for status changes
          if (status && status === 'completed' && task.status !== 'completed') {
            try {
              await createNotification(
                task.created_by,
                'task',
                'Task Completed',
                `Task "${task.title}" has been marked as completed`,
                `/tasks`
              );
            } catch (notifErr) {
              console.error('Error creating completion notification:', notifErr);
            }
          }

          // Send notification if assignment changed
          if (assigned_to !== undefined && assigned_to !== task.assigned_to && assigned_to) {
            try {
              await createNotification(
                assigned_to,
                'task',
                'Task Reassigned',
                `Task "${task.title}" has been reassigned to you`,
                `/tasks`
              );
            } catch (notifErr) {
              console.error('Error creating reassignment notification:', notifErr);
            }
          }

          // Sync with linked action item if task is completed
          if (status === 'completed' && task.action_item_id) {
            dbInstance.run(
              'UPDATE action_items SET status = ? WHERE id = ?',
              ['completed', task.action_item_id],
              () => {}
            );
          }

          // Update dependencies if provided
          if (dependency_ids !== undefined) {
            // Delete existing dependencies
            dbInstance.run('DELETE FROM task_dependencies WHERE task_id = ?', [id], (err) => {
              if (err) {
                console.error('Error deleting dependencies:', err);
              }

              // Add new dependencies
              if (Array.isArray(dependency_ids) && dependency_ids.length > 0) {
                const depInserts = dependency_ids.map(depId => {
                  return new Promise((resolve, reject) => {
                    dbInstance.run(
                      'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
                      [id, depId],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                });

                Promise.all(depInserts)
                  .then(() => {
                    res.json({ message: 'Task updated successfully' });
                  })
                  .catch((err) => {
                    console.error('Error adding dependencies:', err);
                    res.json({ message: 'Task updated but dependencies failed', warning: true });
                  });
              } else {
                res.json({ message: 'Task updated successfully' });
              }
            });
          } else {
            res.json({ message: 'Task updated successfully' });
          }
        }
      );
    }
  );
});

// Delete task
router.delete('/:id', authenticate, requirePermission('manage_tasks', 'delete_tasks'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Check if task exists and user has permission
  const whereClause = req.user.role === 'admin'
    ? 'SELECT * FROM tasks WHERE id = ?'
    : 'SELECT * FROM tasks WHERE id = ? AND created_by = ?';
  const checkParams = req.user.role === 'admin'
    ? [id]
    : [id, userId];

  dbInstance.get(
    whereClause,
    checkParams,
    (err, task) => {
      if (err || !task) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }

      dbInstance.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error deleting task' });
        }
        res.json({ message: 'Task deleted successfully' });
      });
    }
  );
});

// Get tasks with reminders due
router.get('/reminders/due', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const now = new Date().toISOString();

  dbInstance.all(
    `SELECT t.*, u.name as assigned_to_name, l.name as location_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN locations l ON t.location_id = l.id
     WHERE (t.assigned_to = ? OR t.created_by = ?)
     AND t.reminder_date IS NOT NULL
     AND t.reminder_date <= ?
     AND t.status != 'completed'
     ORDER BY t.reminder_date ASC`,
    [userId, userId, now],
    (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ tasks: tasks || [] });
    }
  );
});

// Get tasks that can be started (dependencies completed)
router.get('/ready/start', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.all(
    `SELECT t.*, u.name as assigned_to_name, l.name as location_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN locations l ON t.location_id = l.id
     WHERE (t.assigned_to = ? OR t.created_by = ?)
     AND t.status = 'pending'
     AND (
       t.depends_on_task_id IS NULL 
       OR EXISTS (
         SELECT 1 FROM tasks t2 
         WHERE t2.id = t.depends_on_task_id 
         AND t2.status = 'completed'
       )
     )
     ORDER BY t.due_date ASC, t.priority DESC`,
    [userId, userId],
    (err, tasks) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Check complex dependencies
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) {
        return res.json({ tasks: [] });
      }

      dbInstance.all(
        `SELECT td.task_id, COUNT(*) as pending_deps
         FROM task_dependencies td
         JOIN tasks t ON td.depends_on_task_id = t.id
         WHERE td.task_id IN (${taskIds.map(() => '?').join(',')})
         AND t.status != 'completed'
         GROUP BY td.task_id`,
        taskIds,
        (err, pendingDeps) => {
          if (err) {
            return res.json({ tasks });
          }

          const pendingTaskIds = new Set(pendingDeps.map(d => d.task_id));
          const readyTasks = tasks.filter(t => !pendingTaskIds.has(t.id));

          res.json({ tasks: readyTasks });
        }
      );
    }
  );
});

module.exports = router;

