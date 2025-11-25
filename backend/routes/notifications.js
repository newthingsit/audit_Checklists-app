const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for current user
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { unread_only, limit } = req.query;

  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
  
  // SQL Server uses BIT type and 'read' is a reserved word, so use brackets
  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = `SELECT * FROM notifications WHERE user_id = ?`;
    if (unread_only === 'true') {
      query += ' AND [read] = 0';
    }
  } else {
    query = `SELECT * FROM notifications WHERE user_id = ?`;
    if (unread_only === 'true') {
      query += ' AND read = 0';
    }
  }
  
  const params = [userId];

  if (limit) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query = query.replace('SELECT *', `SELECT TOP ${parseInt(limit)} *`);
    } else {
      query += ` LIMIT ${parseInt(limit)}`;
    }
  }

  query += ' ORDER BY created_at DESC';

  dbInstance.all(query, params, (err, notifications) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ notifications: notifications || [] });
  });
});

// Get unread count
router.get('/unread-count', authenticate, (req, res) => {
  try {
    const dbInstance = db.getDb();
    const userId = req.user?.id;
    
    if (!userId) {
      return res.json({ count: 0 });
    }
    
    const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';

    // SQL Server uses BIT type, so we need to handle boolean comparison differently
    let query;
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND [read] = 0';
    } else {
      query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0';
    }

    dbInstance.get(
      query,
      [userId],
      (err, row) => {
        if (err) {
          // Check if error is due to table not existing
          const errorMessage = err.message || err.toString() || '';
          const isTableNotFound = errorMessage.toLowerCase().includes('no such table') ||
                                 errorMessage.toLowerCase().includes("doesn't exist") ||
                                 errorMessage.toLowerCase().includes('table or view') ||
                                 errorMessage.toLowerCase().includes('invalid object name');
          
          if (isTableNotFound) {
            // Table doesn't exist yet, return 0
            console.log('notifications table does not exist yet, returning 0');
            return res.json({ count: 0 });
          }
          
          console.error('Error fetching unread count:', err);
          // Return 0 instead of 500 to prevent UI errors
          return res.json({ count: 0 });
        }
        res.json({ count: (row && row.count) ? parseInt(row.count) : 0 });
      }
    );
  } catch (error) {
    console.error('Error in unread-count endpoint:', error);
    // Always return 200 with count 0 to prevent UI errors
    return res.json({ count: 0 });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';

  // SQL Server uses brackets for reserved word 'read'
  const query = (dbType === 'mssql' || dbType === 'sqlserver')
    ? 'UPDATE notifications SET [read] = 1 WHERE id = ? AND user_id = ?'
    : 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?';

  dbInstance.run(
    query,
    [id, userId],
    function(err, result) {
      if (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      const changes = (result && result.changes) ? result.changes : (this.changes || 0);
      if (changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// Mark all notifications as read
router.put('/read-all', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';

  // SQL Server uses brackets for reserved word 'read'
  const query = (dbType === 'mssql' || dbType === 'sqlserver')
    ? 'UPDATE notifications SET [read] = 1 WHERE user_id = ? AND [read] = 0'
    : 'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0';

  dbInstance.run(
    query,
    [userId],
    function(err, result) {
      if (err) {
        console.error('Error marking all notifications as read:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      const changes = (result && result.changes) ? result.changes : (this.changes || 0);
      res.json({ message: 'All notifications marked as read', count: changes });
    }
  );
});

// Delete notification
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.run(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json({ message: 'Notification deleted' });
    }
  );
});

// Delete all notifications
router.delete('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const { read_only } = req.query;

  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
  
  // SQL Server uses brackets for reserved word 'read'
  let query = 'DELETE FROM notifications WHERE user_id = ?';
  const params = [userId];

  if (read_only === 'true') {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND [read] = 1';
    } else {
      query += ' AND read = 1';
    }
  }

  dbInstance.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Notifications deleted', count: this.changes });
  });
});

// Helper function to create notification (can be used by other routes)
// Now also sends email if user has email address and preferences allow it
const createNotification = async (userId, type, title, message, link = null, emailData = null) => {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    
    // First, get user email and preferences if email notification is needed
    if (emailData) {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let coalesceFunc = 'COALESCE';
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        coalesceFunc = 'ISNULL';
      }
      
      dbInstance.get(
        `SELECT u.email, u.name, 
         ${coalesceFunc}(up.email_notifications_enabled, 1) as email_notifications_enabled,
         ${coalesceFunc}(up.email_audit_completed, 1) as email_audit_completed,
         ${coalesceFunc}(up.email_action_assigned, 1) as email_action_assigned,
         ${coalesceFunc}(up.email_task_reminder, 1) as email_task_reminder,
         ${coalesceFunc}(up.email_overdue_items, 1) as email_overdue_items,
         ${coalesceFunc}(up.email_scheduled_audit, 1) as email_scheduled_audit
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.id = ?`,
        [userId],
        async (err, user) => {
          if (err) {
            console.error('Error fetching user for email notification:', err);
            // Continue with in-app notification even if email fails
          } else if (user && user.email) {
            // Check if email notifications are enabled and specific type is allowed
            // Convert to boolean (SQL Server returns BIT as 0/1, others return boolean)
            const emailEnabled = Boolean(user.email_notifications_enabled);
            const auditCompleted = Boolean(user.email_audit_completed);
            const actionAssigned = Boolean(user.email_action_assigned);
            const taskReminder = Boolean(user.email_task_reminder);
            const overdueItems = Boolean(user.email_overdue_items);
            const scheduledAudit = Boolean(user.email_scheduled_audit);
            
            let shouldSendEmail = false;
            if (emailEnabled) {
              // Check specific notification type preference
              if (emailData.template === 'auditCompleted' && auditCompleted) {
                shouldSendEmail = true;
              } else if (emailData.template === 'actionItemAssigned' && actionAssigned) {
                shouldSendEmail = true;
              } else if (emailData.template === 'taskReminder' && taskReminder) {
                shouldSendEmail = true;
              } else if (emailData.template === 'overdueItem' && overdueItems) {
                shouldSendEmail = true;
              } else if (emailData.template === 'scheduledAuditReminder' && scheduledAudit) {
                shouldSendEmail = true;
              }
            }
            
            if (shouldSendEmail) {
              // Send email notification asynchronously (don't block notification creation)
              const { sendNotificationEmail } = require('../utils/emailService');
              sendNotificationEmail(user.email, user.name || 'User', emailData.template, emailData.data)
                .catch(emailErr => {
                  console.error('Error sending email notification:', emailErr);
                  // Don't fail notification creation if email fails
                });
            }
          }
        }
      );
    }
    
    // Create in-app notification
    dbInstance.run(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, link],
      function(err) {
        if (err) {
          console.error('Error creating notification:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

module.exports = router;
module.exports.createNotification = createNotification;

