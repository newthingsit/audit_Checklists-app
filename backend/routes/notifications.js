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
  const dbInstance = db.getDb();
  const userId = req.user.id;
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
        console.error('Error fetching unread count:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ count: (row && row.count) ? parseInt(row.count) : 0 });
    }
  );
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
const createNotification = (userId, type, title, message, link = null) => {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
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

