/**
 * Permission Audit Logging Middleware
 * Logs permission checks and access attempts for security auditing
 */

const db = require('../config/database-loader');

/**
 * Log permission check attempt
 * @param {Object} req - Express request object
 * @param {string} permission - Permission being checked
 * @param {boolean} granted - Whether permission was granted
 * @param {string} resource - Resource being accessed (optional)
 */
const logPermissionCheck = (req, permission, granted, resource = null) => {
  try {
    const dbInstance = db.getDb();
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || 'unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const method = req.method;
    const path = req.path;
    const timestamp = new Date().toISOString();

    // Insert into permission_audit_log table (create if doesn't exist)
    dbInstance.run(
      `CREATE TABLE IF NOT EXISTS permission_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        permission TEXT,
        granted INTEGER DEFAULT 0,
        resource TEXT,
        method TEXT,
        path TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      [],
      (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Error creating permission_audit_log table:', err);
          return;
        }

        // Insert audit log entry
        dbInstance.run(
          `INSERT INTO permission_audit_log 
           (user_id, user_email, permission, granted, resource, method, path, ip_address, user_agent, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, userEmail, permission, granted ? 1 : 0, resource, method, path, ipAddress, userAgent, timestamp],
          (insertErr) => {
            if (insertErr) {
              console.error('Error logging permission check:', insertErr);
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Error in permission audit logging:', error);
    // Don't throw - audit logging should not break the application
  }
};

/**
 * Middleware to audit permission checks
 * Wraps the requirePermission middleware to add logging
 */
const auditPermissionCheck = (requiredPermissions) => {
  return (req, res, next) => {
    const { requirePermission } = require('./permissions');
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to log after response
    res.json = function(data) {
      const granted = res.statusCode !== 403;
      const permission = Array.isArray(requiredPermissions) 
        ? requiredPermissions.join(', ') 
        : requiredPermissions;
      
      logPermissionCheck(req, permission, granted, req.path);
      return originalJson(data);
    };

    // Call the actual permission middleware
    requirePermission(...(Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]))(req, res, next);
  };
};

/**
 * Get permission audit logs
 * @param {Object} options - Query options
 * @param {number} options.userId - Filter by user ID
 * @param {string} options.permission - Filter by permission
 * @param {boolean} options.granted - Filter by granted status
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @param {number} options.limit - Limit results
 * @param {number} options.offset - Offset for pagination
 * @param {Function} callback - Callback function
 */
const getAuditLogs = (options = {}, callback) => {
  const dbInstance = db.getDb();
  const {
    userId,
    permission,
    granted,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;

  let query = 'SELECT * FROM permission_audit_log WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  if (permission) {
    query += ' AND permission LIKE ?';
    params.push(`%${permission}%`);
  }

  if (granted !== undefined) {
    query += ' AND granted = ?';
    params.push(granted ? 1 : 0);
  }

  if (startDate) {
    query += ' AND timestamp >= ?';
    params.push(startDate.toISOString());
  }

  if (endDate) {
    query += ' AND timestamp <= ?';
    params.push(endDate.toISOString());
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  dbInstance.all(query, params, (err, logs) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, logs);
  });
};

module.exports = {
  logPermissionCheck,
  auditPermissionCheck,
  getAuditLogs
};

