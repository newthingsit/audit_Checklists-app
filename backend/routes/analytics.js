const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Get dashboard statistics (admins see all audits)
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const dbInstance = db.getDb();

  // Build user filter for queries
  const userFilter = isAdmin ? '' : 'WHERE user_id = ?';
  const userParams = isAdmin ? [] : [userId];

  // Get all statistics in parallel
  Promise.all([
    // Total audits
    new Promise((resolve, reject) => {
      const query = isAdmin 
        ? 'SELECT COUNT(*) as total FROM audits'
        : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ?';
      dbInstance.get(query, userParams, (err, row) => err ? reject(err) : resolve(row.total));
    }),
    // Completed audits
    new Promise((resolve, reject) => {
      const query = isAdmin
        ? 'SELECT COUNT(*) as total FROM audits WHERE status = ?'
        : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?';
      const params = isAdmin ? ['completed'] : [userId, 'completed'];
      dbInstance.get(query, params, (err, row) => err ? reject(err) : resolve(row.total));
    }),
    // In progress audits
    new Promise((resolve, reject) => {
      const query = isAdmin
        ? 'SELECT COUNT(*) as total FROM audits WHERE status = ?'
        : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?';
      const params = isAdmin ? ['in_progress'] : [userId, 'in_progress'];
      dbInstance.get(query, params, (err, row) => err ? reject(err) : resolve(row.total));
    }),
    // Average score
    new Promise((resolve, reject) => {
      const query = isAdmin
        ? 'SELECT AVG(score) as avg FROM audits WHERE score IS NOT NULL'
        : 'SELECT AVG(score) as avg FROM audits WHERE user_id = ? AND score IS NOT NULL';
      dbInstance.get(query, userParams, (err, row) => err ? reject(err) : resolve(row.avg || 0));
    }),
    // Audits by status
    new Promise((resolve, reject) => {
      const query = isAdmin
        ? `SELECT status, COUNT(*) as count FROM audits GROUP BY status`
        : `SELECT status, COUNT(*) as count FROM audits WHERE user_id = ? GROUP BY status`;
      dbInstance.all(query, userParams, (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Audits by month (last 6 months)
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      const whereClause = isAdmin ? '' : 'WHERE user_id = ?';
      const params = isAdmin ? [] : [userId];
      
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT 
          FORMAT(created_at, 'yyyy-MM') as month,
          COUNT(*) as count
         FROM audits
         ${whereClause}
           AND created_at >= DATEADD(MONTH, -6, GETDATE())
         GROUP BY FORMAT(created_at, 'yyyy-MM')
         ORDER BY month`;
        if (isAdmin) {
          query = query.replace('AND created_at', 'WHERE created_at');
        }
      } else if (dbType === 'mysql') {
        query = `SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as count
         FROM audits
         ${whereClause}
           AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month`;
        if (isAdmin) {
          query = query.replace('AND created_at', 'WHERE created_at');
        }
      } else {
        query = `SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as count
         FROM audits
         ${whereClause}
           AND created_at >= date('now', '-6 months')
         GROUP BY month
         ORDER BY month`;
        if (isAdmin) {
          query = query.replace('AND created_at', 'WHERE created_at');
        }
      }
      dbInstance.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Top restaurants
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      const whereClause = isAdmin ? '' : 'WHERE user_id = ?';
      const params = isAdmin ? [] : [userId];
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 restaurant_name, COUNT(*) as audit_count, AVG(score) as avg_score
         FROM audits
         ${whereClause}
         GROUP BY restaurant_name
         ORDER BY audit_count DESC`;
      } else {
        query = `SELECT restaurant_name, COUNT(*) as audit_count, AVG(score) as avg_score
         FROM audits
         ${whereClause}
         GROUP BY restaurant_name
         ORDER BY audit_count DESC
         LIMIT 5`;
      }
      dbInstance.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Recent audits
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
      const params = isAdmin ? [] : [userId];
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 a.*, ct.name as template_name
         FROM audits a
         JOIN checklist_templates ct ON a.template_id = ct.id
         ${whereClause}
         ORDER BY a.created_at DESC`;
      } else {
        query = `SELECT a.*, ct.name as template_name
         FROM audits a
         JOIN checklist_templates ct ON a.template_id = ct.id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT 5`;
      }
      dbInstance.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
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

// Get audit trends (admins see all audits)
router.get('/trends', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
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

  const whereClause = isAdmin ? '' : 'WHERE user_id = ?';
  const params = isAdmin ? [] : [userId];
  
  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = `SELECT 
      ${dateFormat} as period,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(score) as avg_score
     FROM audits
     ${whereClause} AND created_at >= ${dateRange}
     GROUP BY ${dateFormat}
     ORDER BY period`;
    if (isAdmin) {
      query = query.replace('AND created_at', 'WHERE created_at');
    }
  } else {
    query = `SELECT 
      ${dateFormat} as period,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(score) as avg_score
     FROM audits
     ${whereClause} AND created_at >= ${dateRange}
     GROUP BY period
     ORDER BY period`;
    if (isAdmin) {
      query = query.replace('AND created_at', 'WHERE created_at');
    }
  }
  
  dbInstance.all(query, params,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ trends: rows || [] });
    }
  );
});

module.exports = router;

