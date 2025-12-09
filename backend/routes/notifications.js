const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

// Helper to determine database type
const getDbType = () => {
  const dbType = (process.env.DB_TYPE || '').toLowerCase();
  if (dbType === 'mssql' || dbType === 'sqlserver' || process.env.MSSQL_SERVER) {
    return 'mssql';
  }
  return 'sqlite';
};

const getDb = () => db.getDb();
const axios = require('axios');

// Expo Push Notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ==================== WEB APP NOTIFICATION ENDPOINTS ====================

// Get all notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const database = getDb();
    const dbType = getDbType();

    const query = dbType === 'mssql'
      ? `SELECT TOP ${limit} * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;

    const params = dbType === 'mssql' ? [userId] : [userId, limit];

    const notifications = await new Promise((resolve, reject) => {
      database.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const query = dbType === 'mssql'
      ? `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND [read] = 0`
      : `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0`;

    const result = await new Promise((resolve, reject) => {
      database.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({ count: result?.count || 0 });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const updateQuery = dbType === 'mssql'
      ? `UPDATE notifications SET [read] = 1 WHERE id = ? AND user_id = ?`
      : `UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`;

    await new Promise((resolve, reject) => {
      database.run(updateQuery, [id, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const updateQuery = dbType === 'mssql'
      ? `UPDATE notifications SET [read] = 1 WHERE user_id = ?`
      : `UPDATE notifications SET read = 1 WHERE user_id = ?`;

    await new Promise((resolve, reject) => {
      database.run(updateQuery, [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete single notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const database = getDb();

    const deleteQuery = `DELETE FROM notifications WHERE id = ? AND user_id = ?`;

    await new Promise((resolve, reject) => {
      database.run(deleteQuery, [id, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const database = getDb();

    const deleteQuery = `DELETE FROM notifications WHERE user_id = ?`;

    await new Promise((resolve, reject) => {
      database.run(deleteQuery, [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});

// ==================== MOBILE PUSH NOTIFICATION ENDPOINTS ====================

// Register push token
router.post('/register-token', authenticate, async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const database = getDb();

    // Check if token already exists for this user
    const existingQuery = `SELECT id FROM push_tokens WHERE user_id = ? AND token = ?`;

    const existing = await new Promise((resolve, reject) => {
      database.get(existingQuery, [userId, token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      // Update existing token record
      const dbType = getDbType();
      const updateQuery = dbType === 'mssql'
        ? `UPDATE push_tokens SET platform = ?, device_name = ?, updated_at = GETDATE() WHERE id = ?`
        : `UPDATE push_tokens SET platform = ?, device_name = ?, updated_at = datetime('now') WHERE id = ?`;

      await new Promise((resolve, reject) => {
        database.run(updateQuery, [platform || 'unknown', deviceName || 'Unknown Device', existing.id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return res.json({ success: true, message: 'Token updated' });
    }

    // Insert new token
    const dbType = getDbType();
    const insertQuery = dbType === 'mssql'
      ? `INSERT INTO push_tokens (user_id, token, platform, device_name, created_at) VALUES (?, ?, ?, ?, GETDATE())`
      : `INSERT INTO push_tokens (user_id, token, platform, device_name, created_at) VALUES (?, ?, ?, ?, datetime('now'))`;

    await new Promise((resolve, reject) => {
      database.run(insertQuery, [userId, token, platform || 'unknown', deviceName || 'Unknown Device'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info(`Push token registered for user ${userId}`);
    res.json({ success: true, message: 'Token registered' });
  } catch (error) {
    logger.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

// Unregister push token
router.delete('/unregister-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const database = getDb();

    const deleteQuery = `DELETE FROM push_tokens WHERE user_id = ? AND token = ?`;

    await new Promise((resolve, reject) => {
      database.run(deleteQuery, [userId, token], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info(`Push token unregistered for user ${userId}`);
    res.json({ success: true, message: 'Token unregistered' });
  } catch (error) {
    logger.error('Error unregistering push token:', error);
    res.status(500).json({ error: 'Failed to unregister token' });
  }
});

// Send notification to a specific user
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    // Check if sender is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can send notifications' });
    }

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const result = await sendPushNotification(userId, title, body, data);
    res.json(result);
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send notification to multiple users
router.post('/send-bulk', authenticate, async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can send notifications' });
    }

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ error: 'userIds (array), title, and body are required' });
    }

    const results = await Promise.all(
      userIds.map(userId => sendPushNotification(userId, title, body, data))
    );

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({ success: true, sent, failed, results });
  } catch (error) {
    logger.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Get user's notification history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const query = dbType === 'mssql'
      ? `SELECT TOP 50 * FROM notification_history WHERE user_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM notification_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;

    const notifications = await new Promise((resolve, reject) => {
      database.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Mark notification as read
router.put('/read/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const updateQuery = dbType === 'mssql'
      ? `UPDATE notification_history SET [read] = 1 WHERE id = ? AND user_id = ?`
      : `UPDATE notification_history SET read = 1 WHERE id = ? AND user_id = ?`;

    await new Promise((resolve, reject) => {
      database.run(updateQuery, [id, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Helper function to send push notification via Expo
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const database = getDb();
    const dbType = getDbType();

    // Get user's push tokens
    const tokenQuery = `SELECT token FROM push_tokens WHERE user_id = ?`;

    const tokens = await new Promise((resolve, reject) => {
      database.all(tokenQuery, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(r => r.token));
      });
    });

    if (tokens.length === 0) {
      return { success: false, error: 'No push tokens found for user' };
    }

    // Build Expo push messages
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    // Send via Expo Push API
    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    // Save to notification history
    const insertQuery = dbType === 'mssql'
      ? `INSERT INTO notification_history (user_id, title, body, data, created_at) VALUES (?, ?, ?, ?, GETDATE())`
      : `INSERT INTO notification_history (user_id, title, body, data, created_at) VALUES (?, ?, ?, ?, datetime('now'))`;

    await new Promise((resolve, reject) => {
      database.run(insertQuery, [userId, title, body, JSON.stringify(data)], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info(`Notification sent to user ${userId}: ${title}`);
    return { success: true, tickets: response.data.data };
  } catch (error) {
    logger.error('Error in sendPushNotification:', error);
    return { success: false, error: error.message };
  }
}

// Export the helper function for use in other files
router.sendPushNotification = sendPushNotification;

/**
 * Create notification (in-app, push, and email)
 * @param {number} userId - User ID to send notification to
 * @param {string} type - Notification type (e.g., 'audit', 'action', 'reminder')
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} link - Link to navigate to (optional)
 * @param {object} emailOptions - Email options (optional)
 *   - template: Email template name
 *   - data: Array of data for template
 */
async function createNotification(userId, type, title, body, link = null, emailOptions = null) {
  try {
    const database = getDb();
    const dbType = getDbType();
    
    // Get user details for email
    const userQuery = `SELECT name, email FROM users WHERE id = ?`;
    const user = await new Promise((resolve, reject) => {
      database.get(userQuery, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!user) {
      logger.warn(`User ${userId} not found for notification`);
      return { success: false, error: 'User not found' };
    }
    
    // Save in-app notification
    const insertQuery = dbType === 'mssql'
      ? `INSERT INTO notifications (user_id, type, title, body, link, [read], created_at) VALUES (?, ?, ?, ?, ?, 0, GETDATE())`
      : `INSERT INTO notifications (user_id, type, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`;
    
    await new Promise((resolve, reject) => {
      database.run(insertQuery, [userId, type, title, body, link], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Send push notification
    try {
      await sendPushNotification(userId, title, body, { type, link });
    } catch (pushErr) {
      logger.warn('Push notification failed (non-critical):', pushErr.message);
    }
    
    // Send email notification if template is provided
    if (emailOptions && emailOptions.template && user.email) {
      try {
        const emailService = require('../utils/emailService');
        const { sendNotificationEmail } = emailService;
        
        await sendNotificationEmail(
          user.email,
          user.name || 'User',
          emailOptions.template,
          emailOptions.data || []
        );
        
        logger.info(`Email notification sent to ${user.email} for ${type} notification`);
      } catch (emailErr) {
        logger.error('Email notification failed (non-critical):', emailErr.message);
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
}

// Export createNotification for use in other files
router.createNotification = createNotification;

module.exports = router;
