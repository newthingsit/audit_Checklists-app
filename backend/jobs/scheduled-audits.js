const db = require('../config/database-loader');
const { createNotification } = require('../routes/notifications');

const shouldAutoStartOnReminders =
  (process.env.AUTO_START_SCHEDULED_AUDITS_ON_REMINDER || 'true').toLowerCase() === 'true';

/**
 * Background job to auto-create audits from scheduled audits
 * Should be run daily (e.g., via node-cron at 9 AM)
 */
const processScheduledAudits = async () => {
  try {
    const dbInstance = db.getDb();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`[Scheduled Audits Job] Checking for audits due on ${today}...`);

    // Find scheduled audits that are due today
    dbInstance.all(
      `SELECT sa.*, ct.name as template_name, u.name as assigned_to_name
       FROM scheduled_audits sa
       JOIN checklist_templates ct ON sa.template_id = ct.id
       LEFT JOIN users u ON sa.assigned_to = u.id
       WHERE sa.scheduled_date = ? AND sa.status = 'pending'`,
      [today],
      async (err, scheduledAudits) => {
        if (err) {
          console.error('[Scheduled Audits Job] Error fetching scheduled audits:', err);
          return;
        }

        if (!scheduledAudits || scheduledAudits.length === 0) {
          console.log('[Scheduled Audits Job] No scheduled audits due today');
          return;
        }

        console.log(`[Scheduled Audits Job] Found ${scheduledAudits.length} scheduled audit(s) due today`);

        for (const scheduledAudit of scheduledAudits) {
          try {
            // Create audit from scheduled audit
            const auditData = {
              template_id: scheduledAudit.template_id,
              restaurant_name: scheduledAudit.location_name || 'Scheduled Audit',
              location_id: scheduledAudit.location_id,
              user_id: scheduledAudit.assigned_to || scheduledAudit.created_by,
              team_id: null, // Could be enhanced to get team from location
              notes: `Auto-created from scheduled audit #${scheduledAudit.id}`
            };

            // Get template items to calculate total_items
            dbInstance.all(
              'SELECT id FROM checklist_items WHERE template_id = ?',
              [scheduledAudit.template_id],
              (err, items) => {
                if (err) {
                  console.error(`[Scheduled Audits Job] Error fetching template items for scheduled audit ${scheduledAudit.id}:`, err);
                  return;
                }

                const totalItems = items.length;

                // Create the audit
                dbInstance.run(
                  `INSERT INTO audits (template_id, user_id, restaurant_name, location_id, team_id, notes, total_items, status, scheduled_audit_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)`,
                  [
                    auditData.template_id,
                    auditData.user_id,
                    auditData.restaurant_name,
                    auditData.location_id,
                    auditData.team_id,
                    auditData.notes,
                    totalItems,
                    scheduledAudit.id
                  ],
                  async function(err, result) {
                    if (err) {
                      console.error(`[Scheduled Audits Job] Error creating audit from scheduled audit ${scheduledAudit.id}:`, err);
                      return;
                    }

                    const auditId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
                    console.log(`[Scheduled Audits Job] Created audit ${auditId} from scheduled audit ${scheduledAudit.id}`);

                    // Create audit items for each checklist item
                    items.forEach((item) => {
                      dbInstance.run(
                        'INSERT INTO audit_items (audit_id, item_id, status) VALUES (?, ?, ?)',
                        [auditId, item.id, 'pending'],
                        (err) => {
                          if (err) {
                            console.error(`[Scheduled Audits Job] Error creating audit item:`, err);
                          }
                        }
                      );
                    });

                    // Update scheduled audit status
                    let nextRunDate = scheduledAudit.scheduled_date;
                    if (scheduledAudit.frequency === 'daily') {
                      const date = new Date(scheduledAudit.scheduled_date);
                      date.setDate(date.getDate() + 1);
                      nextRunDate = date.toISOString().split('T')[0];
                    } else if (scheduledAudit.frequency === 'weekly') {
                      const date = new Date(scheduledAudit.scheduled_date);
                      date.setDate(date.getDate() + 7);
                      nextRunDate = date.toISOString().split('T')[0];
                    } else if (scheduledAudit.frequency === 'monthly') {
                      const date = new Date(scheduledAudit.scheduled_date);
                      date.setMonth(date.getMonth() + 1);
                      nextRunDate = date.toISOString().split('T')[0];
                    } else {
                      // 'once' - mark as completed
                      dbInstance.run(
                        'UPDATE scheduled_audits SET status = ? WHERE id = ?',
                        ['completed', scheduledAudit.id],
                        () => {}
                      );
                    }

                    // Update next_run_date for recurring audits
                    if (scheduledAudit.frequency !== 'once') {
                      dbInstance.run(
                        'UPDATE scheduled_audits SET scheduled_date = ?, next_run_date = ? WHERE id = ?',
                        [nextRunDate, nextRunDate, scheduledAudit.id],
                        () => {}
                      );
                    }

                    // Send notification to assigned user
                    if (scheduledAudit.assigned_to) {
                      try {
                        await createNotification(
                          scheduledAudit.assigned_to,
                          'audit',
                          'New Audit Created',
                          `Audit "${scheduledAudit.template_name}" has been created from your scheduled audit`,
                          `/audits/${auditId}`,
                          {
                            template: 'scheduledAuditReminder',
                            data: [
                              scheduledAudit.template_name,
                              scheduledAudit.scheduled_date,
                              scheduledAudit.location_name || 'Not specified'
                            ]
                          }
                        );
                      } catch (notifErr) {
                        console.error('[Scheduled Audits Job] Error creating notification:', notifErr);
                      }
                    }
                  }
                );
              }
            );
          } catch (error) {
            console.error(`[Scheduled Audits Job] Error processing scheduled audit ${scheduledAudit.id}:`, error);
          }
        }
      }
    );
  } catch (error) {
    console.error('[Scheduled Audits Job] Fatal error:', error);
  }
};

/**
 * Background job to send reminders for tasks and action items
 * Should be run daily (e.g., via node-cron at 8 AM)
 */
const sendReminders = async () => {
  try {
    const dbInstance = db.getDb();
    const today = new Date().toISOString().split('T')[0];

    console.log(`[Reminders Job] Checking for reminders due on ${today}...`);

    // Check tasks with reminder_date = today
    dbInstance.all(
      `SELECT * FROM tasks 
       WHERE reminder_date = ? 
         AND status != 'completed' 
         AND assigned_to IS NOT NULL`,
      [today],
      async (err, tasks) => {
        if (!err && tasks && tasks.length > 0) {
          console.log(`[Reminders Job] Found ${tasks.length} task reminder(s)`);
          for (const task of tasks) {
            // Get user info for email and send notification
            dbInstance.get('SELECT name, email FROM users WHERE id = ?', [task.assigned_to], async (userErr, user) => {
              if (userErr) {
                console.error(`[Reminders Job] Error fetching user for task ${task.id}:`, userErr);
                return;
              }
              try {
                await createNotification(
                  task.assigned_to,
                  'reminder',
                  'Task Reminder',
                  `Reminder: Task "${task.title}" is due${task.due_date ? ` on ${new Date(task.due_date).toLocaleDateString()}` : ' soon'}`,
                  `/tasks`,
                  {
                    template: 'taskReminder',
                    data: [task.title, task.due_date]
                  }
                );
              } catch (notifErr) {
                console.error(`[Reminders Job] Error sending reminder for task ${task.id}:`, notifErr);
              }
            });
          }
        }
      }
    );

    // Check tasks with due_date = today
    dbInstance.all(
      `SELECT * FROM tasks 
       WHERE due_date = ? 
         AND status != 'completed' 
         AND assigned_to IS NOT NULL`,
      [today],
      async (err, tasks) => {
        if (!err && tasks && tasks.length > 0) {
          console.log(`[Reminders Job] Found ${tasks.length} task(s) due today`);
          for (const task of tasks) {
            dbInstance.get('SELECT name, email FROM users WHERE id = ?', [task.assigned_to], async (userErr, user) => {
              if (userErr) {
                console.error(`[Reminders Job] Error fetching user for task ${task.id}:`, userErr);
                return;
              }
              try {
                await createNotification(
                  task.assigned_to,
                  'reminder',
                  'Task Due Today',
                  `Task "${task.title}" is due today`,
                  `/tasks`,
                  {
                    template: 'taskReminder',
                    data: [task.title, task.due_date]
                  }
                );
              } catch (notifErr) {
                console.error(`[Reminders Job] Error sending due date notification for task ${task.id}:`, notifErr);
              }
            });
          }
        }
      }
    );

    // Check action items with due_date = today
    dbInstance.all(
      `SELECT * FROM action_items 
       WHERE due_date = ? 
         AND status != 'completed' 
         AND assigned_to IS NOT NULL`,
      [today],
      async (err, actionItems) => {
        if (!err && actionItems && actionItems.length > 0) {
          console.log(`[Reminders Job] Found ${actionItems.length} action item(s) due today`);
          for (const actionItem of actionItems) {
            try {
              await createNotification(
                actionItem.assigned_to,
                'reminder',
                'Action Item Due Today',
                `Action item "${actionItem.title}" is due today`,
                `/actions`
              );
            } catch (notifErr) {
              console.error(`[Reminders Job] Error sending due date notification for action item ${actionItem.id}:`, notifErr);
            }
          }
        }
      }
    );

    // Check overdue items (due_date < today)
    const dbType = process.env.DB_TYPE || 'sqlite';
    let overdueQuery;
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      overdueQuery = `SELECT * FROM tasks 
                      WHERE CAST(due_date AS DATE) < CAST(? AS DATE) 
                        AND status != 'completed' 
                        AND assigned_to IS NOT NULL`;
    } else {
      overdueQuery = `SELECT * FROM tasks 
                      WHERE DATE(due_date) < DATE(?) 
                        AND status != 'completed' 
                        AND assigned_to IS NOT NULL`;
    }

    dbInstance.all(
      overdueQuery,
      [today],
      async (err, overdueTasks) => {
        if (!err && overdueTasks && overdueTasks.length > 0) {
          console.log(`[Reminders Job] Found ${overdueTasks.length} overdue task(s)`);
          for (const task of overdueTasks) {
            dbInstance.get('SELECT name, email FROM users WHERE id = ?', [task.assigned_to], async (userErr, user) => {
              if (userErr) {
                console.error(`[Reminders Job] Error fetching user for overdue task ${task.id}:`, userErr);
                return;
              }
              try {
                await createNotification(
                  task.assigned_to,
                  'reminder',
                  'Overdue Task',
                  `Task "${task.title}" is overdue (was due ${new Date(task.due_date).toLocaleDateString()})`,
                  `/tasks`,
                  {
                    template: 'overdueItem',
                    data: ['Task', task.title, task.due_date]
                  }
                );
              } catch (notifErr) {
                console.error(`[Reminders Job] Error sending overdue notification for task ${task.id}:`, notifErr);
              }
            });
          }
        }
      }
    );

    if (shouldAutoStartOnReminders) {
      console.log('[Reminders Job] Auto-start flag enabled. Triggering scheduled audits job...');
      try {
        await processScheduledAudits();
      } catch (autoErr) {
        console.error('[Reminders Job] Auto-start scheduled audits failed:', autoErr);
      }
    }
  } catch (error) {
    console.error('[Reminders Job] Fatal error:', error);
  }
};

module.exports = {
  processScheduledAudits,
  sendReminders
};

