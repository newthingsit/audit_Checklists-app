/**
 * Permission utility functions for mobile app
 * Permissions come strictly from user's role - no extra grants
 */

/**
 * Check if user has a specific permission
 * @param {Array} userPermissions - Array of permissions from user's role
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  // Check for wildcard (all permissions) - admins
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

/**
 * Check if user has any of the required permissions
 * @param {Array} userPermissions - Array of permissions from user's role
 * @param {Array} requiredPermissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (userPermissions, ...requiredPermissions) => {
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
};

/**
 * Check if user has all of the required permissions
 * @param {Array} userPermissions - Array of permissions from user's role
 * @param {Array} requiredPermissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (userPermissions, ...requiredPermissions) => {
  return requiredPermissions.every(permission => hasPermission(userPermissions, permission));
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'superadmin';
};

/**
 * Check if user has a specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
  if (!user || !user.role) return false;
  return user.role.toLowerCase() === role.toLowerCase();
};

