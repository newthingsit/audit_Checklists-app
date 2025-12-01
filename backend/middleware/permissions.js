const { authenticate } = require('./auth');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Get user permissions from database
const permissionAliasMap = {
  'users.create': 'create_users',
  'users.edit': 'edit_users',
  'users.delete': 'delete_users',
  'roles.create': 'create_roles',
  'roles.edit': 'edit_roles',
  'roles.delete': 'delete_roles',
  'audits.create': 'create_audits',
  'audits.edit': 'edit_audits',
  'audits.delete': 'delete_audits',
  'locations.create': 'create_locations',
  'locations.edit': 'edit_locations',
  'locations.delete': 'delete_locations',
  'actions.create': 'create_actions',
  'actions.edit': 'update_actions',
  'actions.delete': 'delete_actions',
  'tasks.create': 'create_tasks',
  'tasks.edit': 'update_tasks',
  'tasks.delete': 'delete_tasks'
};

const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  const normalized = new Set();
  permissions.forEach((perm) => {
    if (!perm) return;
    const mapped = permissionAliasMap[perm] || perm;
    normalized.add(mapped);
  });
  return Array.from(normalized);
};

const getUserPermissions = (userId, role, callback) => {
  if (!role) {
    logger.warn('getUserPermissions called with null/undefined role for user:', userId);
    return callback(null, []);
  }

  const dbInstance = db.getDb();
  if (!dbInstance) {
    logger.error('Database instance is null in getUserPermissions');
    return callback(new Error('Database not initialized'), []);
  }
  
  // Admins have all permissions
  if (isAdminUser({ role })) {
    return callback(null, ['*']); // '*' means all permissions
  }

  // Get role permissions from database
  // Use case-insensitive comparison for SQL Server compatibility
  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = 'SELECT permissions FROM roles WHERE LOWER(name) = LOWER(?)';
  } else {
    query = 'SELECT permissions FROM roles WHERE name = ?';
  }
  
  dbInstance.get(query, [role], (err, roleData) => {
    if (err) {
      logger.error('Error fetching role permissions:', err);
      return callback(err, []);
    }
    
    if (!roleData || !roleData.permissions) {
      logger.warn('Role not found or has no permissions:', role);
      return callback(null, []);
    }

    try {
      const permissions = JSON.parse(roleData.permissions);
      const normalizedPermissions = normalizePermissionList(permissions || []);
      callback(null, normalizedPermissions);
    } catch (parseErr) {
      logger.error('Error parsing role permissions:', parseErr);
      callback(parseErr, []);
    }
  });
};

// Check if user has a specific permission
const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  // Check for wildcard (all permissions)
  if (userPermissions.includes('*')) {
    return true;
  }

  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Special permission mappings for granular permissions
  const permissionMappings = {
    'display_templates': ['view_templates', 'manage_templates'],
    'edit_templates': ['manage_templates', 'update_templates', 'create_templates'],
    'delete_templates': ['manage_templates'],
    'start_scheduled_audits': ['manage_scheduled_audits']
  };

  // Check if required permission is mapped to parent permissions
  if (permissionMappings[requiredPermission]) {
    for (const parentPerm of permissionMappings[requiredPermission]) {
      if (userPermissions.includes(parentPerm)) {
        return true;
      }
    }
  }

  // Check for parent permission (e.g., 'manage_audits' includes 'view_audits')
  const permissionParts = requiredPermission.split('_');
  for (let i = permissionParts.length - 1; i > 0; i--) {
    const parentPermission = permissionParts.slice(0, i).join('_');
    if (userPermissions.includes(parentPermission)) {
      return true;
    }
  }

  return false;
};

// Role-based access control middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // First authenticate the user
    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has required role
      if (!req.user.role) {
        return res.status(403).json({ error: 'Forbidden: User role not found' });
      }

      const userRole = req.user.role.toLowerCase();
      const allowedRolesLower = allowedRoles.map(r => r.toLowerCase());

      if (!allowedRolesLower.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      next();
    });
  };
};

// Permission-based access control middleware
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Admins bypass permission checks
      if (isAdminUser(req.user)) {
        return next();
      }

      getUserPermissions(req.user.id, req.user.role, (err, userPermissions) => {
        if (err) {
          logger.error('Error fetching user permissions:', err);
          return res.status(500).json({ error: 'Error checking permissions' });
        }

        // Check if user has at least one of the required permissions
        const hasRequiredPermission = requiredPermissions.some(permission =>
          hasPermission(userPermissions, permission)
        );

        if (!hasRequiredPermission) {
          // Don't expose internal permissions in production
          const isDev = process.env.NODE_ENV !== 'production';
          return res.status(403).json({ 
            error: 'Forbidden: Insufficient permissions',
            ...(isDev && { required: requiredPermissions, user_permissions: userPermissions })
          });
        }

        // Attach permissions to request for use in route handlers
        req.userPermissions = userPermissions;
        next();
      });
    });
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is admin or manager
const requireAdminOrManager = requireRole('admin', 'manager');

// Middleware to check ownership or admin
const requireOwnershipOrPermission = (resourceUserIdField = 'user_id', ...requiredPermissions) => {
  return (req, res, next) => {
    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Admins bypass ownership checks
      if (isAdminUser(req.user)) {
        return next();
      }

      // If user owns the resource, allow access
      const resourceUserId = req.resource?.[resourceUserIdField] || req.body?.[resourceUserIdField];
      if (resourceUserId && resourceUserId === req.user.id) {
        return next();
      }

      // Otherwise check permissions
      getUserPermissions(req.user.id, req.user.role, (err, userPermissions) => {
        if (err) {
          logger.error('Error fetching user permissions:', err);
          return res.status(500).json({ error: 'Error checking permissions' });
        }

        const hasRequiredPermission = requiredPermissions.some(permission =>
          hasPermission(userPermissions, permission)
        );

        if (!hasRequiredPermission) {
          return res.status(403).json({ 
            error: 'Forbidden: You do not own this resource and lack required permissions'
          });
        }

        req.userPermissions = userPermissions;
        next();
      });
    });
  };
};

// Middleware that allows viewing own resources OR having permission
// Used for list endpoints where users should see their own items even without permission
const allowOwnOrPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Admins always have access
      if (isAdminUser(req.user)) {
        return next();
      }

      // For list endpoints, allow access - the route handler will filter to show only own items
      // This allows users to see their own scheduled audits even without permission
      getUserPermissions(req.user.id, req.user.role, (err, userPermissions) => {
        if (err) {
          logger.error('Error fetching user permissions:', err);
          // Allow access anyway - route will filter to own items
          return next();
        }

        const hasRequiredPermission = requiredPermissions.some(permission =>
          hasPermission(userPermissions, permission)
        );

        if (hasRequiredPermission) {
          req.userPermissions = userPermissions;
          return next();
        }

        // Even without permission, allow access - route handler will filter to own items
        // This is intentional: users should be able to see their own scheduled audits
        req.userPermissions = userPermissions;
        next();
      });
    });
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireAdmin,
  requireAdminOrManager,
  requireOwnershipOrPermission,
  allowOwnOrPermission,
  isAdminUser,
  getUserPermissions,
  hasPermission,
  normalizePermissionList
};

