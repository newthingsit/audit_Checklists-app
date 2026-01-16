const logger = require('./logger');
const { createNotification } = require('../routes/notifications');

/**
 * Escalation Workflows System
 * Auto-escalates action items after X days if not completed
 */

/**
 * Check and escalate overdue action items
 * @param {Object} dbInstance - Database instance
 * @param {Object} options - Escalation options
 * @param {number} options.escalationDays - Days before escalation (default: 3)
 * @param {Function} callback - Callback function
 */
function checkAndEscalateActions(dbInstance, options = {}, callback) {
  const { escalationDays = 3 } = options;
  
  // Find action items that are overdue and not completed
  // Overdue = due_date < today AND status != 'completed'
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
  
  let query;
  let params;
  
  if (isSqlServer) {
    // SQL Server uses DATEADD with negative value
    query = `
      SELECT ai.*, 
             a.restaurant_name,
             a.location_id,
             u.name as assigned_to_name,
             u.email as assigned_to_email,
             ci.title as item_title,
             ci.category,
             ci.is_critical
      FROM action_items ai
      LEFT JOIN audits a ON ai.audit_id = a.id
      LEFT JOIN users u ON ai.assigned_to = u.id
      LEFT JOIN checklist_items ci ON ai.item_id = ci.id
      WHERE ai.status != 'completed'
        AND CAST(ai.due_date AS DATE) < DATEADD(day, -?, CAST(GETDATE() AS DATE))
        AND (ai.escalated = 0 OR ai.escalated IS NULL)
      ORDER BY ai.due_date ASC
    `;
    params = [escalationDays];
  } else {
    query = `
      SELECT ai.*, 
             a.restaurant_name,
             a.location_id,
             u.name as assigned_to_name,
             u.email as assigned_to_email,
             ci.title as item_title,
             ci.category,
             ci.is_critical
      FROM action_items ai
      LEFT JOIN audits a ON ai.audit_id = a.id
      LEFT JOIN users u ON ai.assigned_to = u.id
      LEFT JOIN checklist_items ci ON ai.item_id = ci.id
      WHERE ai.status != 'completed'
        AND DATE(ai.due_date) < DATE('now', '-' || ? || ' days')
        AND (ai.escalated = 0 OR ai.escalated IS NULL)
      ORDER BY ai.due_date ASC
    `;
    params = [escalationDays];
  }

  dbInstance.all(query, params, (err, overdueActions) => {
    if (err) {
      logger.error('Error fetching overdue actions for escalation:', err);
      return callback(err);
    }

    if (!overdueActions || overdueActions.length === 0) {
      logger.info('[Escalation] No overdue actions found for escalation');
      return callback(null, []);
    }

    logger.info(`[Escalation] Found ${overdueActions.length} overdue actions to escalate`);

    // Process each overdue action
    let processed = 0;
    const escalated = [];
    const errors = [];

    overdueActions.forEach((action) => {
      escalateActionItem(dbInstance, action, (err, result) => {
        processed++;
        
        if (err) {
          logger.error(`Error escalating action ${action.id}:`, err);
          errors.push({ action_id: action.id, error: err.message });
        } else if (result) {
          escalated.push(result);
          logger.info(`[Escalation] Escalated action ${action.id} "${action.title}"`);
        }

        // When all processed
        if (processed === overdueActions.length) {
          if (escalated.length > 0) {
            logger.info(`[Escalation] Escalated ${escalated.length} action items`);
          }
          if (errors.length > 0) {
            logger.warn(`[Escalation] ${errors.length} errors during escalation`);
          }
          callback(null, escalated);
        }
      });
    });
  });
}

/**
 * Escalate a single action item
 */
function escalateActionItem(dbInstance, action, callback) {
  // Determine escalation target based on rules
  // Priority: 1. Supervisor of current assignee, 2. Manager, 3. Admin
  getEscalationTarget(dbInstance, action, (err, escalationTarget) => {
    if (err || !escalationTarget) {
      logger.warn(`[Escalation] No escalation target found for action ${action.id}, skipping`);
      return callback(null, null);
    }

    // Update action item with escalation info
    const escalationDate = new Date().toISOString();
    const escalationReason = `Auto-escalated after ${Math.floor((new Date() - new Date(action.due_date)) / (1000 * 60 * 60 * 24))} days overdue`;

    // Check if escalated_to column exists, if not use a workaround
    dbInstance.run(
      `UPDATE action_items 
       SET escalated = 1, 
           escalated_to = ?,
           escalated_at = ?,
           assigned_to = ?
       WHERE id = ?`,
      [escalationTarget.id, escalationDate, escalationTarget.id, action.id],
      function(updateErr) {
        if (updateErr) {
          // Try without escalated_to column (backward compatibility)
          dbInstance.run(
            `UPDATE action_items 
             SET escalated = 1, 
                 escalated_at = ?,
                 assigned_to = ?
             WHERE id = ?`,
            [escalationDate, escalationTarget.id, action.id],
            (err) => {
              if (err) {
                logger.error(`Error updating action ${action.id} for escalation:`, err);
                return callback(err);
              }
              
              // Add escalation comment
              addEscalationComment(dbInstance, action.id, escalationTarget.id, escalationReason, (err) => {
                if (err) {
                  logger.warn(`Error adding escalation comment:`, err);
                }
                
                // Send notifications
                sendEscalationNotifications(dbInstance, action, escalationTarget, escalationReason, (err) => {
                  if (err) {
                    logger.warn(`Error sending escalation notifications:`, err);
                  }
                  
                  callback(null, {
                    action_id: action.id,
                    escalated_to: escalationTarget.id,
                    escalated_to_name: escalationTarget.name
                  });
                });
              });
            }
          );
        } else {
          // Add escalation comment
          addEscalationComment(dbInstance, action.id, escalationTarget.id, escalationReason, (err) => {
            if (err) {
              logger.warn(`Error adding escalation comment:`, err);
            }
            
            // Send notifications
            sendEscalationNotifications(dbInstance, action, escalationTarget, escalationReason, (err) => {
              if (err) {
                logger.warn(`Error sending escalation notifications:`, err);
              }
              
              callback(null, {
                action_id: action.id,
                escalated_to: escalationTarget.id,
                escalated_to_name: escalationTarget.name
              });
            });
          });
        }
      }
    );
  });
}

/**
 * Get escalation target for an action item
 */
function getEscalationTarget(dbInstance, action, callback) {
  // Priority 1: Find supervisor/manager of current assignee
  if (action.assigned_to) {
    dbInstance.get(
      `SELECT u.id, u.name, u.role, u.email
       FROM users u
       WHERE u.id = (
         SELECT supervisor_id FROM users WHERE id = ?
       ) OR u.role = 'manager'
       ORDER BY CASE 
         WHEN u.id = (SELECT supervisor_id FROM users WHERE id = ?) THEN 1
         WHEN u.role = 'manager' THEN 2
         ELSE 3
       END
       LIMIT 1`,
      [action.assigned_to, action.assigned_to],
      (err, supervisor) => {
        if (!err && supervisor) {
          return callback(null, supervisor);
        }
        
        // Priority 2: Find manager assigned to same location
        if (action.location_id) {
          dbInstance.get(
            `SELECT u.id, u.name, u.role, u.email
             FROM users u
             INNER JOIN user_locations ul ON u.id = ul.user_id
             WHERE ul.location_id = ? AND u.role = 'manager'
             LIMIT 1`,
            [action.location_id],
            (err, manager) => {
              if (!err && manager) {
                return callback(null, manager);
              }
              
              // Priority 3: Find any manager
              dbInstance.get(
                `SELECT id, name, role, email 
                 FROM users 
                 WHERE role = 'manager' 
                 LIMIT 1`,
                [],
                (err, manager) => {
                  if (!err && manager) {
                    return callback(null, manager);
                  }
                  
                  // Priority 4: Find admin
                  dbInstance.get(
                    `SELECT id, name, role, email 
                     FROM users 
                     WHERE role = 'admin' 
                     LIMIT 1`,
                    [],
                    callback
                  );
                }
              );
            }
          );
        } else {
          // No location, find any manager
          dbInstance.get(
            `SELECT id, name, role, email 
             FROM users 
             WHERE role = 'manager' 
             LIMIT 1`,
            [],
            (err, manager) => {
              if (!err && manager) {
                return callback(null, manager);
              }
              
              // Fallback to admin
              dbInstance.get(
                `SELECT id, name, role, email 
                 FROM users 
                 WHERE role = 'admin' 
                 LIMIT 1`,
                [],
                callback
              );
            }
          );
        }
      }
    );
  } else {
    // No assignee, find manager for location or any manager
    if (action.location_id) {
      dbInstance.get(
        `SELECT u.id, u.name, u.role, u.email
         FROM users u
         INNER JOIN user_locations ul ON u.id = ul.user_id
         WHERE ul.location_id = ? AND u.role = 'manager'
         LIMIT 1`,
        [action.location_id],
        (err, manager) => {
          if (!err && manager) {
            return callback(null, manager);
          }
          
          // Fallback to any manager or admin
          dbInstance.get(
            `SELECT id, name, role, email 
             FROM users 
             WHERE role IN ('manager', 'admin')
             ORDER BY CASE role WHEN 'manager' THEN 1 ELSE 2 END
             LIMIT 1`,
            [],
            callback
          );
        }
      );
    } else {
      // No location, find any manager or admin
      dbInstance.get(
        `SELECT id, name, role, email 
         FROM users 
         WHERE role IN ('manager', 'admin')
         ORDER BY CASE role WHEN 'manager' THEN 1 ELSE 2 END
         LIMIT 1`,
        [],
        callback
      );
    }
  }
}

/**
 * Add escalation comment to action item
 */
function addEscalationComment(dbInstance, actionId, escalatedToUserId, reason, callback) {
  // Check if action_comments table exists
  dbInstance.run(
    `INSERT INTO action_comments (action_id, user_id, comment) 
     VALUES (?, ?, ?)`,
    [actionId, escalatedToUserId, `[AUTO-ESCALATED] ${reason}`],
    function(err) {
      // Ignore errors if table doesn't exist
      if (err && !err.message.includes('no such table')) {
        return callback(err);
      }
      callback(null);
    }
  );
}

/**
 * Send escalation notifications
 */
function sendEscalationNotifications(dbInstance, action, escalationTarget, reason, callback) {
  const notifications = [];

  // Notify escalation target
  if (escalationTarget && escalationTarget.id) {
    notifications.push(
      createNotification(
        escalationTarget.id,
        'action',
        'Action Item Escalated to You',
        `Action item "${action.title}" has been escalated to you: ${reason}`,
        `/actions`
      ).catch(err => {
        logger.warn(`Error sending notification to escalation target:`, err);
      })
    );
  }

  // Notify original assignee (if different)
  if (action.assigned_to && action.assigned_to !== escalationTarget?.id) {
    notifications.push(
      createNotification(
        action.assigned_to,
        'action',
        'Action Item Escalated',
        `Action item "${action.title}" has been escalated to ${escalationTarget?.name || 'another user'}`,
        `/actions`
      ).catch(err => {
        logger.warn(`Error sending notification to original assignee:`, err);
      })
    );
  }

  // Wait for all notifications
  Promise.all(notifications)
    .then(() => callback(null))
    .catch(err => callback(err));
}

module.exports = {
  checkAndEscalateActions,
  escalateActionItem
};
