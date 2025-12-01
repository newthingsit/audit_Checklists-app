const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

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
  
  // Get current month and last month for comparison
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

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
    // Top users
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
      const params = isAdmin ? [] : [userId];
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 u.id, u.name as user_name, u.email, COUNT(*) as audit_count, AVG(a.score) as avg_score
         FROM audits a
         JOIN users u ON a.user_id = u.id
         ${whereClause}
         GROUP BY u.id, u.name, u.email
         ORDER BY audit_count DESC, avg_score DESC`;
      } else {
        query = `SELECT u.id, u.name as user_name, u.email, COUNT(*) as audit_count, AVG(a.score) as avg_score
         FROM audits a
         JOIN users u ON a.user_id = u.id
         ${whereClause}
         GROUP BY u.id, u.name, u.email
         ORDER BY audit_count DESC, avg_score DESC
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
    }),
    // Current month stats for comparison
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
      const params = isAdmin ? [] : [userId];
      
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND YEAR', 'WHERE YEAR');
        }
        params.push(currentYear, currentMonth);
      } else if (dbType === 'mysql') {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND YEAR', 'WHERE YEAR');
        }
        params.push(currentYear, currentMonth);
      } else {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND strftime', 'WHERE strftime');
        }
        params.push(String(currentYear), String(currentMonth).padStart(2, '0'));
      }
      dbInstance.get(query, params, (err, row) => err ? reject(err) : resolve(row || { total: 0, completed: 0, avg_score: 0 }));
    }),
    // Last month stats for comparison
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      let query;
      const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
      const params = isAdmin ? [] : [userId];
      
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND YEAR', 'WHERE YEAR');
        }
        params.push(lastMonthYear, lastMonth);
      } else if (dbType === 'mysql') {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND YEAR', 'WHERE YEAR');
        }
        params.push(lastMonthYear, lastMonth);
      } else {
        query = `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
          AVG(a.score) as avg_score
         FROM audits a
         ${whereClause} AND strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
        if (isAdmin) {
          query = query.replace('AND strftime', 'WHERE strftime');
        }
        params.push(String(lastMonthYear), String(lastMonth).padStart(2, '0'));
      }
      dbInstance.get(query, params, (err, row) => err ? reject(err) : resolve(row || { total: 0, completed: 0, avg_score: 0 }));
    }),
    // Top performing stores
    new Promise((resolve, reject) => {
      const dbType = process.env.DB_TYPE || 'sqlite';
      const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
      const params = isAdmin ? [] : [userId];
      let query;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        query = `SELECT TOP 5 
          l.name as store_name,
          l.store_number,
          COUNT(*) as audit_count,
          AVG(a.score) as avg_score
         FROM audits a
         LEFT JOIN locations l ON a.location_id = l.id
         ${whereClause}
         GROUP BY l.id, l.name, l.store_number
         HAVING COUNT(*) > 0
         ORDER BY avg_score DESC`;
      } else {
        query = `SELECT 
          l.name as store_name,
          l.store_number,
          COUNT(*) as audit_count,
          AVG(a.score) as avg_score
         FROM audits a
         LEFT JOIN locations l ON a.location_id = l.id
         ${whereClause}
         GROUP BY l.id, l.name, l.store_number
         HAVING COUNT(*) > 0
         ORDER BY avg_score DESC
         LIMIT 5`;
      }
      dbInstance.all(query, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    })
  ])
    .then(([total, completed, inProgress, avgScore, byStatus, byMonth, topUsers, recent, currentMonthStats, lastMonthStats, topStores]) => {
      // Calculate month-over-month changes
      const monthChange = {
        total: currentMonthStats.total - lastMonthStats.total,
        completed: currentMonthStats.completed - lastMonthStats.completed,
        avgScore: (currentMonthStats.avg_score || 0) - (lastMonthStats.avg_score || 0)
      };
      
      res.json({
        total,
        completed,
        inProgress,
        avgScore: Math.round(avgScore * 100) / 100,
        byStatus,
        byMonth,
        topUsers,
        recent,
        currentMonthStats: {
          total: currentMonthStats.total || 0,
          completed: currentMonthStats.completed || 0,
          avgScore: Math.round((currentMonthStats.avg_score || 0) * 100) / 100
        },
        lastMonthStats: {
          total: lastMonthStats.total || 0,
          completed: lastMonthStats.completed || 0,
          avgScore: Math.round((lastMonthStats.avg_score || 0) * 100) / 100
        },
        monthChange,
        topStores
      });
    })
    .catch(err => {
      logger.error('Analytics error:', err);
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

// ========================================
// LEADERBOARD ENDPOINTS
// ========================================

// Get store leaderboard (top performing stores)
router.get('/leaderboard/stores', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { period, limit: queryLimit } = req.query;
  const resultLimit = parseInt(queryLimit) || 10;
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  // Date filter based on period
  let dateFilter = '';
  if (period === 'week') {
    dateFilter = isMssql 
      ? "AND a.created_at >= DATEADD(day, -7, GETDATE())"
      : "AND a.created_at >= date('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -30, GETDATE())"
      : "AND a.created_at >= date('now', '-30 days')";
  } else if (period === 'quarter') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -90, GETDATE())"
      : "AND a.created_at >= date('now', '-90 days')";
  } else if (period === 'year') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -365, GETDATE())"
      : "AND a.created_at >= date('now', '-365 days')";
  }
  
  let query;
  if (isMssql) {
    query = `
      SELECT TOP ${resultLimit}
        l.id as store_id,
        l.name as store_name,
        l.store_number,
        l.city,
        l.region,
        COUNT(a.id) as audit_count,
        ROUND(AVG(CAST(COALESCE(a.score, 0) AS FLOAT)), 1) as avg_score,
        MAX(a.score) as best_score,
        MIN(a.score) as lowest_score,
        SUM(CASE WHEN a.score >= 80 THEN 1 ELSE 0 END) as excellent_count,
        MAX(a.created_at) as last_audit_date
      FROM locations l
      LEFT JOIN audits a ON a.location_id = l.id AND a.status = 'completed' AND a.score IS NOT NULL
      WHERE 1=1 ${dateFilter.replace('AND a.created_at', 'AND (a.created_at IS NULL OR a.created_at')}${dateFilter ? ')' : ''}
      GROUP BY l.id, l.name, l.store_number, l.city, l.region
      HAVING COUNT(a.id) >= 1
      ORDER BY avg_score DESC, audit_count DESC
    `;
  } else {
    query = `
      SELECT 
        l.id as store_id,
        l.name as store_name,
        l.store_number,
        l.city,
        l.region,
        COUNT(a.id) as audit_count,
        ROUND(COALESCE(AVG(a.score), 0), 1) as avg_score,
        MAX(a.score) as best_score,
        MIN(a.score) as lowest_score,
        SUM(CASE WHEN a.score >= 80 THEN 1 ELSE 0 END) as excellent_count,
        MAX(a.created_at) as last_audit_date
      FROM locations l
      LEFT JOIN audits a ON a.location_id = l.id AND a.status = 'completed' AND a.score IS NOT NULL
      WHERE 1=1 ${dateFilter}
      GROUP BY l.id, l.name, l.store_number, l.city, l.region
      HAVING COUNT(a.id) >= 1
      ORDER BY avg_score DESC, audit_count DESC
      LIMIT ${resultLimit}
    `;
  }
  
  dbInstance.all(query, [], (err, stores) => {
    if (err) {
      logger.error('Store leaderboard error:', err);
      // Return empty array instead of 500 error for better UX
      return res.json({ 
        stores: [],
        period: period || 'all',
        generatedAt: new Date().toISOString(),
        message: 'No completed audits with scores found'
      });
    }
    
    // Add rank
    const rankedStores = (stores || []).map((store, index) => ({
      rank: index + 1,
      ...store,
      trend: store.avg_score >= 80 ? 'up' : store.avg_score >= 60 ? 'stable' : 'down'
    }));
    
    res.json({ 
      stores: rankedStores,
      period: period || 'all',
      generatedAt: new Date().toISOString()
    });
  });
});

// Get auditor leaderboard (top performing auditors)
router.get('/leaderboard/auditors', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { period, limit: queryLimit } = req.query;
  const resultLimit = parseInt(queryLimit) || 10;
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  // Date filter based on period
  let dateFilter = '';
  if (period === 'week') {
    dateFilter = isMssql 
      ? "AND a.created_at >= DATEADD(day, -7, GETDATE())"
      : "AND a.created_at >= date('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -30, GETDATE())"
      : "AND a.created_at >= date('now', '-30 days')";
  } else if (period === 'quarter') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -90, GETDATE())"
      : "AND a.created_at >= date('now', '-90 days')";
  } else if (period === 'year') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -365, GETDATE())"
      : "AND a.created_at >= date('now', '-365 days')";
  }
  
  const query = `
    SELECT 
      u.id as user_id,
      u.name as auditor_name,
      u.email,
      COUNT(a.id) as audit_count,
      ROUND(COALESCE(AVG(CAST(a.score AS FLOAT)), 0), 1) as avg_score,
      SUM(CASE WHEN a.score >= 80 THEN 1 ELSE 0 END) as excellent_audits,
      SUM(CASE WHEN a.score < 60 THEN 1 ELSE 0 END) as needs_improvement,
      COUNT(DISTINCT a.location_id) as stores_audited,
      MAX(a.created_at) as last_audit_date
    FROM users u
    INNER JOIN audits a ON a.user_id = u.id
    WHERE a.status = 'completed' AND a.score IS NOT NULL ${dateFilter}
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(a.id) >= 1
    ORDER BY audit_count DESC, avg_score DESC
    ${isMssql ? `OFFSET 0 ROWS FETCH NEXT ${resultLimit} ROWS ONLY` : `LIMIT ${resultLimit}`}
  `;
  
  dbInstance.all(query, [], (err, auditors) => {
    if (err) {
      logger.error('Auditor leaderboard error:', err);
      // Return empty array instead of 500 error for better UX
      return res.json({ 
        auditors: [],
        period: period || 'all',
        generatedAt: new Date().toISOString(),
        message: 'No completed audits with scores found'
      });
    }
    
    // Add rank and badges
    const rankedAuditors = (auditors || []).map((auditor, index) => {
      const badges = [];
      if (auditor.audit_count >= 50) badges.push('🏆 Top Auditor');
      if (auditor.avg_score >= 85) badges.push('⭐ High Performer');
      if (auditor.excellent_audits >= 10) badges.push('🎯 Excellence Champion');
      if (auditor.stores_audited >= 10) badges.push('🌍 Multi-Store Expert');
      
      return {
        rank: index + 1,
        ...auditor,
        badges,
        performance: auditor.avg_score >= 80 ? 'excellent' : auditor.avg_score >= 60 ? 'good' : 'needs_improvement'
      };
    });
    
    res.json({ 
      auditors: rankedAuditors,
      period: period || 'all',
      generatedAt: new Date().toISOString()
    });
  });
});

// Get combined leaderboard summary for dashboard
router.get('/leaderboard/summary', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { period } = req.query;
  
  let dateFilter = '';
  if (period === 'month') {
    dateFilter = "AND a.created_at >= date('now', '-30 days')";
  }
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    dateFilter = dateFilter.replace("date('now', '-30 days')", "DATEADD(day, -30, GETDATE())");
  }
  
  Promise.all([
    // Top 5 stores
    new Promise((resolve, reject) => {
      dbInstance.all(`
        SELECT l.name as store_name, l.store_number, 
               COUNT(a.id) as audits, ROUND(AVG(CAST(a.score AS FLOAT)), 0) as score
        FROM locations l
        INNER JOIN audits a ON a.location_id = l.id
        WHERE a.status = 'completed' AND a.score IS NOT NULL ${dateFilter}
        GROUP BY l.id, l.name, l.store_number
        ORDER BY score DESC, audits DESC
        ${dbType === 'mssql' || dbType === 'sqlserver' ? 'OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY' : 'LIMIT 5'}
      `, [], (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Top 5 auditors
    new Promise((resolve, reject) => {
      dbInstance.all(`
        SELECT u.name as auditor_name, u.email,
               COUNT(a.id) as audits, ROUND(AVG(CAST(a.score AS FLOAT)), 0) as score
        FROM users u
        INNER JOIN audits a ON a.user_id = u.id
        WHERE a.status = 'completed' AND a.score IS NOT NULL ${dateFilter}
        GROUP BY u.id, u.name, u.email
        ORDER BY audits DESC, score DESC
        ${dbType === 'mssql' || dbType === 'sqlserver' ? 'OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY' : 'LIMIT 5'}
      `, [], (err, rows) => err ? reject(err) : resolve(rows || []));
    }),
    // Overall stats
    new Promise((resolve, reject) => {
      dbInstance.get(`
        SELECT 
          COUNT(DISTINCT a.location_id) as total_stores_audited,
          COUNT(DISTINCT a.user_id) as total_auditors,
          COUNT(a.id) as total_audits,
          ROUND(AVG(CAST(a.score AS FLOAT)), 1) as overall_avg_score
        FROM audits a
        WHERE a.status = 'completed' AND a.score IS NOT NULL ${dateFilter}
      `, [], (err, row) => err ? reject(err) : resolve(row || {}));
    })
  ])
  .then(([topStores, topAuditors, stats]) => {
    res.json({
      topStores: topStores.map((s, i) => ({ rank: i + 1, ...s })),
      topAuditors: topAuditors.map((a, i) => ({ rank: i + 1, ...a })),
      stats,
      period: period || 'all'
    });
  })
  .catch(err => {
    logger.error('Leaderboard summary error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

// ========================================
// TREND ANALYSIS ENDPOINTS
// ========================================

// Get detailed trend analysis with comparisons
router.get('/trends/analysis', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { compareWith } = req.query; // 'previous_period', 'last_year'
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  // Current period (last 30 days)
  const currentPeriodFilter = isMssql 
    ? "a.created_at >= DATEADD(day, -30, GETDATE())"
    : "a.created_at >= date('now', '-30 days')";
  
  // Previous period (30-60 days ago)
  const previousPeriodFilter = isMssql
    ? "a.created_at >= DATEADD(day, -60, GETDATE()) AND a.created_at < DATEADD(day, -30, GETDATE())"
    : "a.created_at >= date('now', '-60 days') AND a.created_at < date('now', '-30 days')";
  
  // Same period last year
  const lastYearFilter = isMssql
    ? "a.created_at >= DATEADD(day, -395, GETDATE()) AND a.created_at < DATEADD(day, -365, GETDATE())"
    : "a.created_at >= date('now', '-395 days') AND a.created_at < date('now', '-365 days')";
  
  const getStats = (filter) => {
    return new Promise((resolve, reject) => {
      dbInstance.get(`
        SELECT 
          COUNT(*) as total_audits,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          ROUND(AVG(CAST(score AS FLOAT)), 1) as avg_score,
          SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) as excellent,
          SUM(CASE WHEN score < 60 THEN 1 ELSE 0 END) as poor,
          COUNT(DISTINCT location_id) as stores
        FROM audits a
        WHERE ${filter} AND status = 'completed'
      `, [], (err, row) => err ? reject(err) : resolve(row || {}));
    });
  };
  
  Promise.all([
    getStats(currentPeriodFilter),
    getStats(previousPeriodFilter),
    getStats(lastYearFilter)
  ])
  .then(([current, previous, lastYear]) => {
    // Calculate changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    res.json({
      current: {
        period: 'Last 30 days',
        ...current
      },
      previous: {
        period: 'Previous 30 days',
        ...previous
      },
      lastYear: {
        period: 'Same period last year',
        ...lastYear
      },
      changes: {
        vsPrevious: {
          audits: calculateChange(current.total_audits, previous.total_audits),
          score: ((current.avg_score || 0) - (previous.avg_score || 0)).toFixed(1),
          stores: calculateChange(current.stores, previous.stores)
        },
        vsLastYear: {
          audits: calculateChange(current.total_audits, lastYear.total_audits),
          score: ((current.avg_score || 0) - (lastYear.avg_score || 0)).toFixed(1),
          stores: calculateChange(current.stores, lastYear.stores)
        }
      }
    });
  })
  .catch(err => {
    logger.error('Trend analysis error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

// Get weekly breakdown for the current month
router.get('/trends/weekly', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { month, year } = req.query;
  
  const targetMonth = parseInt(month) || new Date().getMonth() + 1;
  const targetYear = parseInt(year) || new Date().getFullYear();
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  let weekQuery;
  if (isMssql) {
    weekQuery = `
      SELECT 
        DATEPART(week, created_at) as week_number,
        COUNT(*) as audits,
        ROUND(AVG(CAST(score AS FLOAT)), 1) as avg_score,
        SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) as excellent
      FROM audits
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? AND status = 'completed'
      GROUP BY DATEPART(week, created_at)
      ORDER BY week_number
    `;
  } else {
    weekQuery = `
      SELECT 
        strftime('%W', created_at) as week_number,
        COUNT(*) as audits,
        ROUND(AVG(score), 1) as avg_score,
        SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) as excellent
      FROM audits
      WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ? AND status = 'completed'
      GROUP BY strftime('%W', created_at)
      ORDER BY week_number
    `;
  }
  
  const params = isMssql 
    ? [targetMonth, targetYear] 
    : [targetMonth.toString().padStart(2, '0'), targetYear.toString()];
  
  dbInstance.all(weekQuery, params, (err, weeks) => {
    if (err) {
      logger.error('Weekly trends error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      weeks: weeks || [],
      month: targetMonth,
      year: targetYear
    });
  });
});

module.exports = router;

