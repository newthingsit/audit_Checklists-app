const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Get all scheduled audits (admins see all, regular users see their own)
// Users can see their own scheduled audits - no permission check needed (similar to audits route)
router.get('/', authenticate, (req, res) => {
  logger.debug('[Scheduled Audits] Route hit - GET /api/scheduled-audits');
  
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const userEmail = req.user.email || '';
  const isAdmin = isAdminUser(req.user);
  const { page, limit } = req.query;
  
  // Pagination settings
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Max 100 per page
  const offset = (pageNum - 1) * limitNum;
  
  logger.debug('[Scheduled Audits] User ID:', userId, 'Is Admin:', isAdmin);

  // Get database type for query compatibility
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  let baseQuery = `FROM scheduled_audits sa
               JOIN checklist_templates ct ON sa.template_id = ct.id
               LEFT JOIN locations l ON sa.location_id = l.id
               LEFT JOIN users u ON sa.assigned_to = u.id
               LEFT JOIN users creator ON sa.created_by = creator.id`;
  
  let params = [];
  if (isAdmin) {
    baseQuery += ` WHERE 1=1`;
  } else {
    // For regular users, show audits where:
    // 1. They created it (created_by = userId)
    // 2. They are assigned to it (assigned_to = userId)
    // 3. OR assigned user's email matches (for cases where assigned_to might be wrong but email matches)
    // NOTE: The entire OR condition must be wrapped in parentheses so the AND status filter applies to all
    
    // Use different syntax for SQL Server vs others
    if (isSqlServer) {
      // SQL Server syntax - wrap OR conditions in parentheses
      baseQuery += ` WHERE (sa.created_by = ? OR sa.assigned_to = ? OR sa.assigned_to IN (
        SELECT id FROM users WHERE LOWER(email) = LOWER(?)
      ))`;
    } else {
      // SQLite/MySQL/PostgreSQL syntax - wrap OR conditions in parentheses
      // Check if assigned_to matches a user with the same email
      baseQuery += ` WHERE (sa.created_by = ? OR sa.assigned_to = ? OR EXISTS (
        SELECT 1 FROM users u2 
        WHERE u2.id = sa.assigned_to 
        AND LOWER(u2.email) = LOWER(?)
      ) OR sa.assigned_to IN (
        SELECT id FROM users WHERE LOWER(email) = LOWER(?)
      ))`;
    }
    // For SQL Server, we only need 3 params, for others we need 4
    if (isSqlServer) {
      params = [userId, userId, userEmail];
    } else {
      params = [userId, userId, userEmail, userEmail];
    }
  }

  // Exclude completed scheduled audits from the main list
  // Completed audits should be viewed in audit history, not in scheduled audits
  // Handle case-insensitive comparison and NULL values
  if (isSqlServer) {
    // SQL Server: Use LOWER and LTRIM/RTRIM for case-insensitive comparison
    baseQuery += ` AND (sa.status IS NULL OR LOWER(LTRIM(RTRIM(CAST(sa.status AS VARCHAR(50))))) <> 'completed')`;
  } else {
    // SQLite/MySQL/PostgreSQL: Use LOWER() and TRIM() for case-insensitive comparison
    baseQuery += ` AND (sa.status IS NULL OR LOWER(TRIM(COALESCE(sa.status, ''))) <> 'completed')`;
  }

  // Count query for pagination metadata
  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
  
  // Data query with pagination
  let dataQuery = `SELECT sa.*, ct.name as template_name, l.name as location_name, l.store_number,
               u.name as assigned_to_name, u.email as assigned_to_email,
               creator.name as created_by_name, creator.email as created_by_email
               ${baseQuery} ORDER BY sa.scheduled_date ASC`;
  
  // Add pagination
  if (isSqlServer) {
    dataQuery += ` OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;
  } else {
    dataQuery += ` LIMIT ? OFFSET ?`;
  }

  // Get total count first
  dbInstance.get(countQuery, params, (countErr, countResult) => {
    if (countErr) {
      logger.error('Error counting scheduled audits:', countErr.message);
      return res.status(500).json({ error: 'Database error', details: countErr.message });
    }
    
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    // Add pagination params in the correct order for each DB
    const dataParams = isSqlServer 
      ? [...params, offset, limitNum]  // OFFSET, FETCH NEXT
      : [...params, limitNum, offset]; // LIMIT, OFFSET
    
    dbInstance.all(dataQuery, dataParams, (err, schedules) => {
      if (err) {
        logger.error('Error fetching scheduled audits:', err.message);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      // Debug logging (only in development)
      logger.debug(`[Scheduled Audits] User: ${req.user.name} (ID: ${userId})`);
      logger.debug(`[Scheduled Audits] Found ${schedules.length} schedules`);
      
      res.json({ 
        schedules,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    });
  });
});

// Get reschedule count for current user in current month
// IMPORTANT: This route MUST be defined BEFORE /:id to prevent Express from matching "reschedule-count" as an ID
router.get('/reschedule-count', (req, res) => {
  // Default response - sent on any error
  const defaultResponse = {
    rescheduleCount: 0,
    limit: 2,
    remainingReschedules: 2,
    count: 0,
    remaining: 2
  };

  // Helper to send response - ALWAYS returns 200
  const sendResponse = (countVal = 0) => {
    if (res.headersSent) return;
    
    try {
      const count = (typeof countVal === 'number' && !isNaN(countVal) && countVal >= 0) ? countVal : 0;
      const limit = 2;
      const remaining = Math.max(0, limit - count);
      
      res.status(200).json({
        rescheduleCount: count,
        limit,
        remainingReschedules: remaining,
        count,
        remaining
      });
    } catch (e) {
      try {
        if (!res.headersSent) {
          res.status(200).json(defaultResponse);
        }
      } catch (e2) {
        logger.error('[Reschedule Count] Failed to send response:', e2.message);
      }
    }
  };

  // Process the request
  try {
    // Get token
    const authHeader = req.header('Authorization') || req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    if (!token) {
      return sendResponse(0);
    }

    // Verify token
    let userId = null;
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-DEVELOPMENT-ONLY';
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded?.id || decoded?.userId || null;
    } catch (authError) {
      return sendResponse(0);
    }

    if (!userId) {
      return sendResponse(0);
    }

    // Get database instance
    let dbInstance = null;
    try {
      dbInstance = db.getDb();
    } catch (e) {
      return sendResponse(0);
    }

    if (!dbInstance || typeof dbInstance.get !== 'function') {
      return sendResponse(0);
    }

    // Query database
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Timeout protection
    let responded = false;
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        sendResponse(0);
      }
    }, 2000);

    try {
      const queryResult = dbInstance.get(
        `SELECT COUNT(*) as count FROM reschedule_tracking WHERE user_id = ? AND reschedule_month = ?`,
        [userId, currentMonth],
        (err, result) => {
          if (responded) return;
          responded = true;
          clearTimeout(timeout);
          
          if (err) {
            return sendResponse(0);
          }

          let count = 0;
          try {
            if (result) {
              const rawCount = result.count || result.COUNT || 0;
              count = typeof rawCount === 'string' ? parseInt(rawCount, 10) : Number(rawCount);
              if (isNaN(count) || count < 0) count = 0;
            }
          } catch (parseErr) {
            count = 0;
          }

          sendResponse(count);
        }
      );

      // Handle promise-based databases (SQL Server, PostgreSQL, MySQL)
      if (queryResult && typeof queryResult.then === 'function') {
        queryResult
          .then((result) => {
            if (responded) return;
            responded = true;
            clearTimeout(timeout);
            
            let count = 0;
            try {
              if (result) {
                const rawCount = result.count || result.COUNT || 0;
                count = typeof rawCount === 'string' ? parseInt(rawCount, 10) : Number(rawCount);
                if (isNaN(count) || count < 0) count = 0;
              }
            } catch (parseErr) {
              count = 0;
            }
            sendResponse(count);
          })
          .catch((err) => {
            if (responded) return;
            responded = true;
            clearTimeout(timeout);
            sendResponse(0);
          });
      }
    } catch (queryError) {
      if (!responded) {
        responded = true;
        clearTimeout(timeout);
        sendResponse(0);
      }
    }
  } catch (error) {
    logger.error('[Reschedule Count] Unexpected error:', error.message);
    sendResponse(0);
  }
});

// Get single scheduled audit
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const userEmail = req.user.email || '';
  const isAdmin = isAdminUser(req.user);

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name, u.email as assigned_to_email
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.id = ?`;
  
  let params = [req.params.id];
  
  if (!isAdmin) {
    query += ` AND (sa.created_by = ? OR sa.assigned_to = ? OR EXISTS (
      SELECT 1 FROM users u2 
      WHERE u2.id = sa.assigned_to 
      AND LOWER(u2.email) = LOWER(?)
    ))`;
    params.push(userId, userId, userEmail);
  }

  dbInstance.get(query, params,
    (err, schedule) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json({ schedule });
    }
  );
});

// Create scheduled audit
router.post('/', authenticate, requirePermission('manage_scheduled_audits', 'create_scheduled_audits'), (req, res) => {
  const { template_id, location_id, scheduled_date, frequency, assigned_to } = req.body;
  const dbInstance = db.getDb();

  if (!template_id || !scheduled_date) {
    return res.status(400).json({ error: 'Template ID and scheduled date are required' });
  }

  // Calculate next run date based on frequency
  let nextRunDate = scheduled_date;
  if (frequency === 'daily') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'weekly') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 7);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'monthly') {
    const date = new Date(scheduled_date);
    date.setMonth(date.getMonth() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  }

  dbInstance.run(
    `INSERT INTO scheduled_audits (template_id, location_id, assigned_to, scheduled_date, frequency, next_run_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [template_id, location_id || null, assigned_to || null, scheduled_date, frequency || 'once', nextRunDate, req.user.id],
    function(err, result) {
      if (err) {
        return res.status(500).json({ error: 'Error creating scheduled audit' });
      }
      const scheduleId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
      
      // Send notification (in-app, push, and email) to assigned user if assigned
      if (assigned_to) {
        // Get user and template/location details for notification
        dbInstance.get(
          `SELECT u.name, u.email, ct.name as template_name, l.name as location_name
           FROM users u
           LEFT JOIN checklist_templates ct ON ct.id = ?
           LEFT JOIN locations l ON l.id = ?
           WHERE u.id = ?`,
          [template_id, location_id, assigned_to],
          async (userErr, userData) => {
            if (!userErr && userData) {
              try {
                const { createNotification } = require('./notifications');
                const appUrl = process.env.APP_URL || 'https://app.litebitefoods.com';
                const scheduledAuditUrl = appUrl.includes('litebitefoods.com') 
                  ? `${appUrl}/scheduled`
                  : `https://app.litebitefoods.com/scheduled`;
                
                // Create notification (includes in-app, push, and email)
                await createNotification(
                  assigned_to,
                  'scheduled_audit',
                  'New Scheduled Audit Assigned',
                  `You have been assigned a scheduled audit: "${userData.template_name || 'Scheduled Audit'}" on ${new Date(scheduled_date).toLocaleDateString()}`,
                  scheduledAuditUrl,
                  {
                    template: 'scheduledAuditReminder',
                    data: [
                      userData.template_name || 'Scheduled Audit',
                      scheduled_date,
                      userData.location_name || 'Not specified'
                    ]
                  }
                );
                
                logger.info(`Scheduled audit notification sent to user ${assigned_to} for schedule ${scheduleId}`);
              } catch (notifErr) {
                logger.error('Error sending scheduled audit notification:', notifErr);
                // Don't fail the request if notification fails
              }
            }
          }
        );
      }
      
      res.status(201).json({ id: scheduleId, message: 'Scheduled audit created successfully' });
    }
  );
});

// Update scheduled audit
router.put('/:id', authenticate, requirePermission('manage_scheduled_audits', 'update_scheduled_audits'), (req, res) => {
  const { id } = req.params;
  const { template_id, location_id, scheduled_date, frequency, assigned_to, status } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Calculate next run date based on frequency if frequency or scheduled_date changed
  let nextRunDate = scheduled_date;
  if (frequency === 'daily') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'weekly') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 7);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'monthly') {
    const date = new Date(scheduled_date);
    date.setMonth(date.getMonth() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  }

  // Get current scheduled audit to check if assigned_to changed
  dbInstance.get(
    `SELECT assigned_to FROM scheduled_audits WHERE id = ?`,
    [id],
    (getErr, currentSchedule) => {
      if (getErr) {
        return res.status(500).json({ error: 'Error fetching scheduled audit' });
      }
      
      dbInstance.run(
        `UPDATE scheduled_audits 
         SET template_id = ?, location_id = ?, assigned_to = ?, scheduled_date = ?, frequency = ?, next_run_date = ?, status = ?
         WHERE id = ? AND created_by = ?`,
        [template_id, location_id, assigned_to, scheduled_date, frequency || 'once', nextRunDate, status, id, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating scheduled audit' });
          }
          
          // Send notification if assigned_to changed or was newly assigned
          const wasAssigned = currentSchedule && currentSchedule.assigned_to;
          const isNowAssigned = assigned_to && assigned_to !== null;
          const assignmentChanged = wasAssigned !== isNowAssigned || (isNowAssigned && currentSchedule.assigned_to !== assigned_to);
          
          if (isNowAssigned && assignmentChanged) {
            // Get user and template/location details for notification
            dbInstance.get(
              `SELECT u.name, u.email, ct.name as template_name, l.name as location_name
               FROM users u
               LEFT JOIN checklist_templates ct ON ct.id = ?
               LEFT JOIN locations l ON l.id = ?
               WHERE u.id = ?`,
              [template_id, location_id, assigned_to],
              async (userErr, userData) => {
                if (!userErr && userData) {
                  try {
                    const { createNotification } = require('./notifications');
                    const appUrl = process.env.APP_URL || 'https://app.litebitefoods.com';
                    const scheduledAuditUrl = appUrl.includes('litebitefoods.com') 
                      ? `${appUrl}/scheduled`
                      : `https://app.litebitefoods.com/scheduled`;
                    
                    // Create notification (includes in-app, push, and email)
                    await createNotification(
                      assigned_to,
                      'scheduled_audit',
                      'Scheduled Audit Updated',
                      `Your scheduled audit "${userData.template_name || 'Scheduled Audit'}" has been updated. Scheduled for ${new Date(scheduled_date).toLocaleDateString()}`,
                      scheduledAuditUrl,
                      {
                        template: 'scheduledAuditReminder',
                        data: [
                          userData.template_name || 'Scheduled Audit',
                          scheduled_date,
                          userData.location_name || 'Not specified'
                        ]
                      }
                    );
                    
                    logger.info(`Scheduled audit notification sent to user ${assigned_to} for schedule ${id}`);
                  } catch (notifErr) {
                    logger.error('Error sending scheduled audit notification:', notifErr);
                    // Don't fail the request if notification fails
                  }
                }
              }
            );
          }
          
          res.json({ message: 'Scheduled audit updated successfully' });
        }
      );
    }
  );
});

// Delete scheduled audit
router.delete('/:id', authenticate, requirePermission('manage_scheduled_audits', 'delete_scheduled_audits'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.run('DELETE FROM scheduled_audits WHERE id = ? AND created_by = ?', [id, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting scheduled audit' });
    }
    res.json({ message: 'Scheduled audit deleted successfully' });
  });
});

// Get scheduled audits report
router.get('/report', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, location_id, template_id, status, frequency } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, l.store_number,
               u.name as assigned_to_name, u.email as assigned_to_email
               FROM scheduled_audits sa
               JOIN checklist_templates ct ON sa.template_id = ct.id
               LEFT JOIN locations l ON sa.location_id = l.id
               LEFT JOIN users u ON sa.assigned_to = u.id`;
  
  let params = [];
  if (isAdmin) {
    query += ` WHERE 1=1`;
  } else {
    query += ` WHERE sa.created_by = ? OR sa.assigned_to = ?`;
    params = [userId, userId];
  }

  // Apply filters
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) <= ?';
    }
    params.push(date_to);
  }
  if (location_id) {
    query += ' AND sa.location_id = ?';
    params.push(location_id);
  }
  if (template_id) {
    query += ' AND sa.template_id = ?';
    params.push(template_id);
  }
  if (status) {
    query += ' AND sa.status = ?';
    params.push(status);
  }
  if (frequency) {
    query += ' AND sa.frequency = ?';
    params.push(frequency);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      logger.error('Scheduled audits report error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Calculate statistics
    const totalSchedules = schedules.length;
    const byStatus = {};
    const byFrequency = {};
    const byTemplate = {};
    const byLocation = {};
    const upcoming = [];
    const overdue = [];
    const today = new Date().toISOString().split('T')[0];

    schedules.forEach(schedule => {
      // By status
      const status = schedule.status || 'pending';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // By frequency
      const freq = schedule.frequency || 'once';
      byFrequency[freq] = (byFrequency[freq] || 0) + 1;

      // By template
      const templateName = schedule.template_name || 'Unknown';
      if (!byTemplate[templateName]) {
        byTemplate[templateName] = { count: 0, completed: 0, pending: 0 };
      }
      byTemplate[templateName].count++;
      if (status === 'completed') {
        byTemplate[templateName].completed++;
      } else {
        byTemplate[templateName].pending++;
      }

      // By location
      const locationName = schedule.location_name || 'All Stores';
      if (!byLocation[locationName]) {
        byLocation[locationName] = { count: 0, completed: 0, pending: 0 };
      }
      byLocation[locationName].count++;
      if (status === 'completed') {
        byLocation[locationName].completed++;
      } else {
        byLocation[locationName].pending++;
      }

      // Upcoming and overdue
      const scheduledDate = schedule.scheduled_date;
      if (scheduledDate > today && status !== 'completed') {
        upcoming.push(schedule);
      } else if (scheduledDate < today && status !== 'completed') {
        overdue.push(schedule);
      }
    });

    res.json({
      summary: {
        totalSchedules,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        byFrequency: Object.entries(byFrequency).map(([frequency, count]) => ({ frequency, count })),
        upcoming: upcoming.length,
        overdue: overdue.length
      },
      byTemplate: Object.entries(byTemplate).map(([template, data]) => ({
        template,
        ...data
      })),
      byLocation: Object.entries(byLocation).map(([location, data]) => ({
        location,
        ...data
      })),
      upcoming: upcoming.slice(0, 10), // Next 10 upcoming
      overdue: overdue.slice(0, 10), // Next 10 overdue
      schedules: schedules.map(s => ({
        id: s.id,
        template_name: s.template_name,
        location_name: s.location_name,
        assigned_to_name: s.assigned_to_name,
        scheduled_date: s.scheduled_date,
        next_run_date: s.next_run_date,
        frequency: s.frequency,
        status: s.status || 'pending',
        created_at: s.created_at
      }))
    });
  });
});

// Get reschedule tracking report
router.get('/reschedule-report', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, user_id } = req.query;
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  let query = `
    SELECT rt.*, 
           sa.template_id, ct.name as template_name,
           sa.location_id, l.name as location_name, l.store_number,
           u.name as user_name, u.email as user_email
    FROM reschedule_tracking rt
    LEFT JOIN scheduled_audits sa ON rt.scheduled_audit_id = sa.id
    LEFT JOIN checklist_templates ct ON sa.template_id = ct.id
    LEFT JOIN locations l ON sa.location_id = l.id
    LEFT JOIN users u ON rt.user_id = u.id
    WHERE 1=1
  `;
  let params = [];

  // Apply filters
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(rt.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(rt.created_at) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(rt.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(rt.created_at) <= ?';
    }
    params.push(date_to);
  }
  if (user_id) {
    query += ' AND rt.user_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY rt.created_at DESC';

  dbInstance.all(query, params, (err, reschedules) => {
    if (err) {
      logger.error('Error fetching reschedule report:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate summary statistics
    const byUser = {};
    const byMonth = {};
    const byTemplate = {};
    
    reschedules.forEach(r => {
      // By user
      const userName = r.user_name || 'Unknown';
      if (!byUser[userName]) {
        byUser[userName] = { count: 0, user_id: r.user_id, email: r.user_email };
      }
      byUser[userName].count++;

      // By month
      const month = r.reschedule_month || 'Unknown';
      if (!byMonth[month]) {
        byMonth[month] = 0;
      }
      byMonth[month]++;

      // By template
      const templateName = r.template_name || 'Unknown';
      if (!byTemplate[templateName]) {
        byTemplate[templateName] = 0;
      }
      byTemplate[templateName]++;
    });

    res.json({
      summary: {
        totalReschedules: reschedules.length,
        byUser: Object.entries(byUser).map(([name, data]) => ({
          user_name: name,
          user_id: data.user_id,
          email: data.email,
          reschedule_count: data.count
        })).sort((a, b) => b.reschedule_count - a.reschedule_count),
        byMonth: Object.entries(byMonth).map(([month, count]) => ({
          month,
          count
        })).sort((a, b) => b.month.localeCompare(a.month)),
        byTemplate: Object.entries(byTemplate).map(([template, count]) => ({
          template,
          count
        })).sort((a, b) => b.count - a.count)
      },
      reschedules: reschedules.map(r => ({
        id: r.id,
        scheduled_audit_id: r.scheduled_audit_id,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        template_name: r.template_name,
        location_name: r.location_name,
        store_number: r.store_number,
        old_date: r.old_date,
        new_date: r.new_date,
        reschedule_month: r.reschedule_month,
        created_at: r.created_at
      }))
    });
  });
});

// Bulk import scheduled audits from CSV
router.post('/import', authenticate, requirePermission('manage_scheduled_audits', 'create_scheduled_audits'), async (req, res) => {
  const dbInstance = db.getDb();
  const createdBy = req.user.id;
  const { schedules } = req.body; // Array of schedule objects

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ error: 'Schedules array is required' });
  }

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Get database type for query compatibility
  const dbType = process.env.DB_TYPE || 'sqlite';

  // Helper functions
  const findUser = (employeeId, name) => {
    return new Promise((resolve, reject) => {
      // If employeeId looks like an email, try email match first
      if (employeeId && employeeId.includes('@')) {
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [employeeId], (err, user) => {
          if (err) return reject(err);
          if (user) return resolve(user);
          
          // Fallback to name match
          const query2 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
            : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
          dbInstance.get(query2, [name], (err, user) => {
            if (err) return reject(err);
            resolve(user);
          });
        });
      } else {
        // Try case-insensitive name match first
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [name], (err, user) => {
          if (err) return reject(err);
          if (user) return resolve(user);
          
          // Try email match with employee ID (case-insensitive)
          if (employeeId) {
            const query2 = dbType === 'mssql' || dbType === 'sqlserver'
              ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(email))) LIKE LOWER(?) OR LOWER(LTRIM(RTRIM(email))) LIKE LOWER(?)'
              : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) LIKE LOWER(?) OR LOWER(TRIM(email)) LIKE LOWER(?) LIMIT 1';
            dbInstance.get(query2, [`%${employeeId}%`, `${employeeId}@%`], (err, user) => {
              if (err) return reject(err);
              resolve(user);
            });
          } else {
            resolve(null);
          }
        });
      }
    });
  };

  const findTemplate = (checklistName) => {
    return new Promise((resolve, reject) => {
      // First try exact match (case-insensitive)
      const query1 = dbType === 'mssql' || dbType === 'sqlserver'
        ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
        : 'SELECT id, name FROM checklist_templates WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
      dbInstance.get(query1, [checklistName], (err, template) => {
        if (err) return reject(err);
        if (template) return resolve(template);
        
        // Try partial match (case-insensitive)
        const query2 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(LTRIM(RTRIM(name))) LIKE LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name FROM checklist_templates WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query2, [`%${checklistName}%`], (err, template) => {
          if (err) return reject(err);
          if (template) return resolve(template);
          
          // Try matching without special characters
          const cleanName = checklistName.replace(/[-\s]/g, '');
          const query3 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(REPLACE(REPLACE(name, \'-\', \'\'), \' \', \'\')) = LOWER(?)'
            : 'SELECT id, name FROM checklist_templates WHERE LOWER(REPLACE(REPLACE(name, "-", ""), " ", "")) = LOWER(?) LIMIT 1';
          dbInstance.get(query3, [cleanName], (err, template) => {
            if (err) return reject(err);
            resolve(template);
          });
        });
      });
    });
  };

  const findOrCreateLocation = (storeNumber, storeName) => {
    return new Promise((resolve, reject) => {
      // Try to find by store name first (case-insensitive)
      if (storeName) {
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM locations WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name FROM locations WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [storeName], (err, location) => {
          if (err) return reject(err);
          if (location) return resolve(location);
          
          // Try partial match on store name
          const query2 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name FROM locations WHERE LOWER(LTRIM(RTRIM(name))) LIKE LOWER(?)'
            : 'SELECT id, name FROM locations WHERE LOWER(TRIM(name)) LIKE LOWER(?) LIMIT 1';
          dbInstance.get(query2, [`%${storeName}%`], (err, location) => {
            if (err) return reject(err);
            if (location) return resolve(location);
            
            // Try finding by store number
            if (storeNumber) {
              const query3 = dbType === 'mssql' || dbType === 'sqlserver'
                ? 'SELECT TOP 1 id, name FROM locations WHERE store_number = ? OR name LIKE ?'
                : 'SELECT id, name FROM locations WHERE store_number = ? OR name LIKE ? LIMIT 1';
              dbInstance.get(query3, [storeNumber, `%${storeNumber}%`], (err, location) => {
                if (err) return reject(err);
                if (location) return resolve(location);
                
                // Create new location
                const locationName = storeName || `Store ${storeNumber}`;
                dbInstance.run(
                  'INSERT INTO locations (name, store_number, address, created_by) VALUES (?, ?, ?, ?)',
                  [locationName, storeNumber || null, `Store ${storeNumber || 'Unknown'}`, createdBy],
                  function(err) {
                    if (err) return reject(err);
                    const scheduleId = (this && this.lastID) ? this.lastID : 0;
                    resolve({ id: scheduleId, name: locationName });
                  }
                );
              });
            } else {
              // Create new location without store number
              const locationName = storeName || 'Unknown Store';
              dbInstance.run(
                'INSERT INTO locations (name, address, created_by) VALUES (?, ?, ?)',
                [locationName, 'Unknown', createdBy],
                function(err) {
                  if (err) return reject(err);
                  const scheduleId = (this && this.lastID) ? this.lastID : 0;
                  resolve({ id: scheduleId, name: locationName });
                }
              );
            }
          });
        });
      } else if (storeNumber) {
        // Try finding by store number only
        const query = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM locations WHERE store_number = ? OR name LIKE ?'
          : 'SELECT id, name FROM locations WHERE store_number = ? OR name LIKE ? LIMIT 1';
        dbInstance.get(query, [storeNumber, `%${storeNumber}%`], (err, location) => {
          if (err) return reject(err);
          if (location) return resolve(location);
          
          // Create new location
          const locationName = `Store ${storeNumber}`;
          dbInstance.run(
            'INSERT INTO locations (name, store_number, address, created_by) VALUES (?, ?, ?, ?)',
            [locationName, storeNumber, `Store ${storeNumber}`, createdBy],
            function(err) {
              if (err) return reject(err);
              const scheduleId = (this && this.lastID) ? this.lastID : 0;
              resolve({ id: scheduleId, name: locationName });
            }
          );
        });
      } else {
        return reject(new Error('Store number or store name is required'));
      }
    });
  };

  const createScheduledAudit = (templateId, locationId, assignedTo, scheduledDate) => {
    return new Promise((resolve, reject) => {
      dbInstance.run(
        `INSERT INTO scheduled_audits (template_id, location_id, assigned_to, scheduled_date, frequency, next_run_date, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, locationId, assignedTo, scheduledDate, 'once', scheduledDate, 'pending', createdBy],
        function(err, result) {
          if (err) {
            logger.error('Error creating scheduled audit:', err);
            return reject(err);
          }
          // Handle different database types for lastID
          const scheduleId = (this && this.lastID) ? this.lastID : ((result && result.lastID) ? result.lastID : 0);
          if (scheduleId === 0) {
            console.warn('Warning: Could not get lastID after insert. Schedule may have been created but ID is unknown.');
          }
          resolve(scheduleId);
        }
      );
    });
  };

  // Process each schedule
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const { employee, name, checklist, store, storeName, startDate, status } = schedule;

    try {
      logger.debug(`[Import] Processing row ${i + 1}:`, { employee, name, checklist, store, storeName, startDate });
      
      if (!name || !checklist || !startDate) {
        const missing = [];
        if (!name) missing.push('name');
        if (!checklist) missing.push('checklist');
        if (!startDate) missing.push('startDate');
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Missing required fields: ${missing.join(', ')}`);
        logger.debug(`[Import] Row ${i + 1} skipped: Missing fields`);
        continue;
      }

      // Parse date - handle multiple formats (DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
      let dateStr;
      
      // Clean the date string
      const cleanDate = startDate.trim().replace(/['"]/g, '').replace(/\s+/g, ' ');
      
      logger.debug(`[Import] Parsing date for row ${i + 1}: "${cleanDate}"`);
      
      // Try parsing different date formats
      try {
        // First, try DD-MM-YYYY or DD/MM/YYYY format (e.g., "26-11-2025")
        const parts = cleanDate.split(/[-\/\.]/);
        if (parts.length === 3) {
          const part1 = parseInt(parts[0], 10);
          const part2 = parseInt(parts[1], 10);
          const part3 = parseInt(parts[2], 10);
          
          // Check if it's DD-MM-YYYY format (day > 12 indicates DD-MM format)
          if (part1 > 12 && part1 <= 31 && part2 >= 1 && part2 <= 12 && part3 > 1000) {
            // DD-MM-YYYY format: day, month, year
            // Format directly as YYYY-MM-DD to avoid timezone issues
            const year = part3;
            const month = String(part2).padStart(2, '0');
            const day = String(part1).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            logger.debug(`[Import] Parsed as DD-MM-YYYY: ${dateStr}`);
          } else if (part1 >= 1 && part1 <= 12 && part2 >= 1 && part2 <= 31 && part3 > 1000) {
            // MM-DD-YYYY format: month, day, year
            const year = part3;
            const month = String(part1).padStart(2, '0');
            const day = String(part2).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            logger.debug(`[Import] Parsed as MM-DD-YYYY: ${dateStr}`);
          } else if (part1 > 1000 && part2 >= 1 && part2 <= 12 && part3 >= 1 && part3 <= 31) {
            // YYYY-MM-DD format: year, month, day
            const year = part1;
            const month = String(part2).padStart(2, '0');
            const day = String(part3).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            logger.debug(`[Import] Parsed as YYYY-MM-DD: ${dateStr}`);
          }
        }
        
        // If not parsed yet, try standard Date constructor and format manually
        if (!dateStr) {
          const scheduledDate = new Date(cleanDate);
          if (!isNaN(scheduledDate.getTime()) && scheduledDate.getFullYear() > 1000 && scheduledDate.getFullYear() <= 2100) {
            // Format manually to avoid timezone issues
            const year = scheduledDate.getFullYear();
            const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
            const day = String(scheduledDate.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            logger.debug(`[Import] Parsed using Date constructor: ${dateStr}`);
          }
        }
      } catch (error) {
        logger.error(`[Import] Date parsing error for row ${i + 1}:`, error);
        dateStr = null;
      }
      
      if (!dateStr) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Invalid date format: "${startDate}" (expected: DD-MM-YYYY, MM/DD/YYYY, or YYYY-MM-DD)`);
        continue;
      }

      // Find user
      const user = await findUser(employee || '', name);
      if (!user) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: User not found: ${name}${employee ? ` (${employee})` : ''}`);
        continue;
      }
      logger.debug(`[Import] Found user: ${user.name} (${user.email}) for row ${i + 1}`);

      // Find template
      const template = await findTemplate(checklist);
      if (!template) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Template not found: ${checklist}`);
        continue;
      }
      logger.debug(`[Import] Found template: ${template.name} for row ${i + 1}`);

      // Find or create location
      logger.debug(`[Import] Finding/creating location for row ${i + 1}: store="${store}", storeName="${storeName}"`);
      const location = await findOrCreateLocation(store || '', storeName || '');
      logger.debug(`[Import] Found/created location: ${location.name} (ID: ${location.id}) for row ${i + 1}`);

      // Create scheduled audit
      logger.debug(`[Import] Creating scheduled audit for row ${i + 1}: templateId=${template.id}, locationId=${location.id}, userId=${user.id}, date=${dateStr}`);
      const scheduleId = await createScheduledAudit(template.id, location.id, user.id, dateStr);
      logger.debug(`[Import] ✓ Successfully created scheduled audit ID: ${scheduleId} for row ${i + 1}`);

      results.success++;
    } catch (error) {
      logger.error(`[Import] ✗ Error processing row ${i + 1}:`, error);
      results.failed++;
      const errorMsg = error.message || error.toString();
      results.errors.push(`Row ${i + 1}: ${errorMsg}`);
    }
  }

  logger.debug(`[Import] Import completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`);
  if (results.errors.length > 0) {
    logger.debug(`[Import] Errors:`, results.errors);
  }
  
  res.json({
    message: `Import completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`,
    results
  });
});

// Reschedule a scheduled audit (limited to 2 times per month per user)
router.post('/:id/reschedule', authenticate, requirePermission('reschedule_scheduled_audits', 'manage_scheduled_audits'), (req, res) => {
  const { id } = req.params;
  const { new_date } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  if (!new_date) {
    return res.status(400).json({ error: 'New date is required' });
  }

  // Validate date format
  const newDate = new Date(new_date);
  if (isNaN(newDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  // Validate that the new date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newDateOnly = new Date(newDate);
  newDateOnly.setHours(0, 0, 0, 0);
  
  if (newDateOnly < today) {
    return res.status(400).json({ error: 'Cannot reschedule to a past date' });
  }

  // Get the scheduled audit
  dbInstance.get(
    `SELECT sa.* FROM scheduled_audits sa WHERE sa.id = ?`,
    [id],
    (err, scheduledAudit) => {
      if (err) {
        logger.error('Error fetching scheduled audit:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (!scheduledAudit) {
        return res.status(404).json({ error: 'Scheduled audit not found' });
      }

      // Check if user has permission to reschedule
      // User can reschedule if:
      // 1. They are assigned to it (assigned_to = userId)
      // 2. They created it (created_by = userId)
      // 3. They are an admin
      // Convert to numbers for comparison (database might return strings)
      const assignedTo = scheduledAudit.assigned_to ? parseInt(scheduledAudit.assigned_to, 10) : null;
      const createdBy = scheduledAudit.created_by ? parseInt(scheduledAudit.created_by, 10) : null;
      const userIdNum = parseInt(userId, 10);
      
      const canReschedule = isAdmin || 
                           (assignedTo !== null && assignedTo === userIdNum) || 
                           (createdBy !== null && createdBy === userIdNum);

      if (!canReschedule) {
        return res.status(403).json({ error: 'You do not have permission to reschedule this audit' });
      }

      // Get current month in YYYY-MM format
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Count how many times this user has rescheduled this month
      const dbType = process.env.DB_TYPE || 'sqlite';
      let countQuery;
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        countQuery = `SELECT COUNT(*) as count 
                      FROM reschedule_tracking 
                      WHERE user_id = ? AND reschedule_month = ?`;
      } else {
        countQuery = `SELECT COUNT(*) as count 
                      FROM reschedule_tracking 
                      WHERE user_id = ? AND reschedule_month = ?`;
      }

      dbInstance.get(countQuery, [userId, currentMonth], (countErr, countResult) => {
        let rescheduleCount = 0;
        
        if (countErr) {
          // Check if error is due to table not existing
          const errorMessage = countErr.message || countErr.toString() || '';
          const isTableNotFound = errorMessage.toLowerCase().includes('no such table') ||
                                 errorMessage.toLowerCase().includes("doesn't exist") ||
                                 errorMessage.toLowerCase().includes('table or view') ||
                                 errorMessage.toLowerCase().includes('invalid object name');
          
          if (isTableNotFound) {
            // Table doesn't exist yet, treat as 0 reschedules
            logger.debug('reschedule_tracking table does not exist yet, treating as 0 reschedules');
            rescheduleCount = 0;
          } else {
            logger.error('Error counting reschedules:', countErr);
            return res.status(500).json({ error: 'Database error', details: countErr.message });
          }
        } else {
          rescheduleCount = countResult?.count || 0;
        }

        if (rescheduleCount >= 2) {
          return res.status(400).json({ 
            error: 'Reschedule limit reached', 
            message: 'You have already rescheduled 2 audits this month. The limit is 2 reschedules per month.',
            rescheduleCount: rescheduleCount,
            limit: 2
          });
        }

        // Get the old date
        const oldDate = scheduledAudit.scheduled_date;

        // Update the scheduled audit
        const updateQuery = `UPDATE scheduled_audits 
                            SET scheduled_date = ?, 
                                next_run_date = CASE 
                                  WHEN frequency = 'daily' THEN DATE(?, '+1 day')
                                  WHEN frequency = 'weekly' THEN DATE(?, '+7 days')
                                  WHEN frequency = 'monthly' THEN DATE(?, '+1 month')
                                  ELSE ?
                                END
                            WHERE id = ?`;

        // Database-specific date calculations
        let updateParams;
        if (dbType === 'mssql' || dbType === 'sqlserver') {
          // SQL Server syntax
          dbInstance.run(
            `UPDATE scheduled_audits 
             SET scheduled_date = ?, 
                 next_run_date = CASE 
                   WHEN frequency = 'daily' THEN DATEADD(day, 1, ?)
                   WHEN frequency = 'weekly' THEN DATEADD(day, 7, ?)
                   WHEN frequency = 'monthly' THEN DATEADD(month, 1, ?)
                   ELSE ?
                 END
             WHERE id = ?`,
            [new_date, new_date, new_date, new_date, new_date, id],
            function(updateErr) {
              if (updateErr) {
                logger.error('Error updating scheduled audit:', updateErr);
                return res.status(500).json({ error: 'Database error', details: updateErr.message });
              }

              // Record the reschedule
              dbInstance.run(
                `INSERT INTO reschedule_tracking (scheduled_audit_id, user_id, old_date, new_date, reschedule_month)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, userId, oldDate, new_date, currentMonth],
                (trackErr) => {
                  if (trackErr) {
                    logger.error('Error tracking reschedule:', trackErr);
                    // Don't fail the request if tracking fails
                  }

                  res.json({ 
                    message: 'Audit rescheduled successfully',
                    rescheduleCount: rescheduleCount + 1,
                    remainingReschedules: 2 - (rescheduleCount + 1)
                  });
                }
              );
            }
          );
        } else if (dbType === 'mysql') {
          // MySQL syntax
          dbInstance.run(
            `UPDATE scheduled_audits 
             SET scheduled_date = ?, 
                 next_run_date = CASE 
                   WHEN frequency = 'daily' THEN DATE_ADD(?, INTERVAL 1 DAY)
                   WHEN frequency = 'weekly' THEN DATE_ADD(?, INTERVAL 7 DAY)
                   WHEN frequency = 'monthly' THEN DATE_ADD(?, INTERVAL 1 MONTH)
                   ELSE ?
                 END
             WHERE id = ?`,
            [new_date, new_date, new_date, new_date, new_date, id],
            function(updateErr) {
              if (updateErr) {
                logger.error('Error updating scheduled audit:', updateErr);
                return res.status(500).json({ error: 'Database error', details: updateErr.message });
              }

              // Record the reschedule
              dbInstance.run(
                `INSERT INTO reschedule_tracking (scheduled_audit_id, user_id, old_date, new_date, reschedule_month)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, userId, oldDate, new_date, currentMonth],
                (trackErr) => {
                  if (trackErr) {
                    logger.error('Error tracking reschedule:', trackErr);
                    // Don't fail the request if tracking fails
                  }

                  res.json({ 
                    message: 'Audit rescheduled successfully',
                    rescheduleCount: rescheduleCount + 1,
                    remainingReschedules: 2 - (rescheduleCount + 1)
                  });
                }
              );
            }
          );
        } else {
          // SQLite/PostgreSQL syntax
          const dbType = process.env.DB_TYPE || 'sqlite';
          let updateQuery;
          let updateParams;
          
          if (dbType === 'postgres' || dbType === 'postgresql') {
            // PostgreSQL syntax
            updateQuery = `UPDATE scheduled_audits 
             SET scheduled_date = $1, 
                 next_run_date = CASE 
                   WHEN frequency = 'daily' THEN $2::date + INTERVAL '1 day'
                   WHEN frequency = 'weekly' THEN $2::date + INTERVAL '7 days'
                   WHEN frequency = 'monthly' THEN $2::date + INTERVAL '1 month'
                   ELSE $2::date
                 END
             WHERE id = $3`;
            updateParams = [new_date, new_date, id];
          } else {
            // SQLite syntax
            updateQuery = `UPDATE scheduled_audits 
             SET scheduled_date = ?, 
                 next_run_date = CASE 
                   WHEN frequency = 'daily' THEN DATE(?, '+1 day')
                   WHEN frequency = 'weekly' THEN DATE(?, '+7 days')
                   WHEN frequency = 'monthly' THEN DATE(?, '+1 month')
                   ELSE ?
                 END
             WHERE id = ?`;
            updateParams = [new_date, new_date, new_date, new_date, new_date, id];
          }
          
          dbInstance.run(updateQuery, updateParams,
            function(updateErr) {
              if (updateErr) {
                logger.error('Error updating scheduled audit:', updateErr);
                return res.status(500).json({ error: 'Database error', details: updateErr.message });
              }

              // Record the reschedule
              dbInstance.run(
                `INSERT INTO reschedule_tracking (scheduled_audit_id, user_id, old_date, new_date, reschedule_month)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, userId, oldDate, new_date, currentMonth],
                (trackErr) => {
                  if (trackErr) {
                    logger.error('Error tracking reschedule:', trackErr);
                    // Don't fail the request if tracking fails
                  }

                  res.json({ 
                    message: 'Audit rescheduled successfully',
                    rescheduleCount: rescheduleCount + 1,
                    remainingReschedules: 2 - (rescheduleCount + 1)
                  });
                }
              );
            }
          );
        }
      });
    }
  );
});

module.exports = router;

