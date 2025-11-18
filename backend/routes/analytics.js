const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;
  const dbInstance = db.getDb();

  // Get all statistics in parallel
  Promise.all([
    // Total audits
    new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT COUNT(*) as total FROM audits WHERE user_id = ?',
        [userId],
        (err, row) => err ? reject(err) : resolve(row.total)
      );
    }),
    // Completed audits
    new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?',
        [userId, 'completed'],
        (err, row) => err ? reject(err) : resolve(row.total)
      );
    }),
    // In progress audits
    new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?',
        [userId, 'in_progress'],
        (err, row) => err ? reject(err) : resolve(row.total)
      );
    }),
    // Average score
    new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT AVG(score) as avg FROM audits WHERE user_id = ? AND score IS NOT NULL',
        [userId],
        (err, row) => err ? reject(err) : resolve(row.avg || 0)
      );
    }),
    // Audits by status
    new Promise((resolve, reject) => {
      dbInstance.all(
        `SELECT status, COUNT(*) as count 
         FROM audits 
         WHERE user_id = ? 
         GROUP BY status`,
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    }),
    // Audits by month (last 6 months)
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT 
          FORMAT(created_at, 'yyyy-MM') as month,
          COUNT(*) as count
         FROM audits
         WHERE user_id = ? 
           AND created_at >= DATEADD(MONTH, -6, GETDATE())
         GROUP BY FORMAT(created_at, 'yyyy-MM')
         ORDER BY month`;
      } else if (dbType === 'mysql') {
        query = `SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as count
         FROM audits
         WHERE user_id = ? 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month`;
      } else {
        query = `SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as count
         FROM audits
         WHERE user_id = ? 
           AND created_at >= date('now', '-6 months')
         GROUP BY month
         ORDER BY month`;
      }
      dbInstance.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Top restaurants
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 restaurant_name, COUNT(*) as audit_count, AVG(score) as avg_score
         FROM audits
         WHERE user_id = ?
         GROUP BY restaurant_name
         ORDER BY audit_count DESC`;
      } else {
        query = `SELECT restaurant_name, COUNT(*) as audit_count, AVG(score) as avg_score
         FROM audits
         WHERE user_id = ?
         GROUP BY restaurant_name
         ORDER BY audit_count DESC
         LIMIT 5`;
      }
      dbInstance.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Recent audits
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 a.*, ct.name as template_name
         FROM audits a
         JOIN checklist_templates ct ON a.template_id = ct.id
         WHERE a.user_id = ?
         ORDER BY a.created_at DESC`;
      } else {
        query = `SELECT a.*, ct.name as template_name
         FROM audits a
         JOIN checklist_templates ct ON a.template_id = ct.id
         WHERE a.user_id = ?
         ORDER BY a.created_at DESC
         LIMIT 5`;
      }
      dbInstance.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows || []));
    })
  ])
    .then(([total, completed, inProgress, avgScore, byStatus, byMonth, topRestaurants, recent]) => {
      res.json({
        total,
        completed,
        inProgress,
        avgScore: Math.round(avgScore * 100) / 100,
        byStatus,
        byMonth,
        topRestaurants,
        recent
      });
    })
    .catch(err => {
      console.error('Analytics error:', err);
      res.status(500).json({ error: 'Error fetching analytics' });
    });
});

// Get audit trends
router.get('/trends', authenticate, (req, res) => {
  const userId = req.user.id;
  const { period = 'month' } = req.query; // month, week, day
  const dbInstance = db.getDb();

  const dbType = process.env.DB_TYPE || 'sqlite';
  let dateFormat, dateRange;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    switch (period) {
      case 'week':
        dateFormat = "FORMAT(created_at, 'yyyy-WW')";
        dateRange = "DATEADD(WEEK, -12, GETDATE())";
        break;
      case 'day':
        dateFormat = "FORMAT(created_at, 'yyyy-MM-dd')";
        dateRange = "DATEADD(DAY, -30, GETDATE())";
        break;
      default:
        dateFormat = "FORMAT(created_at, 'yyyy-MM')";
        dateRange = "DATEADD(MONTH, -12, GETDATE())";
    }
  } else if (dbType === 'mysql') {
    switch (period) {
      case 'week':
        dateFormat = "DATE_FORMAT(created_at, '%Y-W%u')";
        dateRange = "DATE_SUB(NOW(), INTERVAL 12 WEEK)";
        break;
      case 'day':
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        dateRange = "DATE_SUB(NOW(), INTERVAL 30 DAY)";
        break;
      default:
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m')";
        dateRange = "DATE_SUB(NOW(), INTERVAL 12 MONTH)";
    }
  } else {
    switch (period) {
      case 'week':
        dateFormat = "strftime('%Y-W%W', created_at)";
        dateRange = "date('now', '-12 weeks')";
        break;
      case 'day':
        dateFormat = "strftime('%Y-%m-%d', created_at)";
        dateRange = "date('now', '-30 days')";
        break;
      default:
        dateFormat = "strftime('%Y-%m', created_at)";
        dateRange = "date('now', '-12 months')";
    }
  }

  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = `SELECT 
      ${dateFormat} as period,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(score) as avg_score
     FROM audits
     WHERE user_id = ? AND created_at >= ${dateRange}
     GROUP BY ${dateFormat}
     ORDER BY period`;
  } else {
    query = `SELECT 
      ${dateFormat} as period,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(score) as avg_score
     FROM audits
     WHERE user_id = ? AND created_at >= ${dateRange}
     GROUP BY period
     ORDER BY period`;
  }
  
  dbInstance.all(query, [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ trends: rows || [] });
    }
  );
});

module.exports = router;

