/**
 * Permission utility functions for frontend
 */

/**
 * Check if user has a specific permission
 * @param {Array} userPermissions - Array of user permissions
 * @param {string} requiredPermission - Required permission to check
 * @returns {boolean}
 */
export const hasPermission = (userPermissions, requiredPermission) => {
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
 * Check if user has at least one of the required permissions
 * @param {Array} userPermissions - Array of user permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {boolean}
 */
export const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.some(permission => 
    hasPermission(userPermissions, permission)
  );
};

/**
 * Check if user has all of the required permissions
 * @param {Array} userPermissions - Array of user permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {boolean}
 */
export const hasAllPermissions = (userPermissions, requiredPermissions) => {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every(permission => 
    hasPermission(userPermissions, permission)
  );
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  if (!user || !user.role) {
    return false;
  }
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'superadmin';
};

/**
 * Check if user has a specific role
 * @param {Object} user - User object
 * @param {string|Array} roles - Role(s) to check
 * @returns {boolean}
 */
export const hasRole = (user, roles) => {
  if (!user || !user.role) {
    return false;
  }

  const userRole = user.role.toLowerCase();
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  const rolesLower = rolesArray.map(r => r.toLowerCase());

  return rolesLower.includes(userRole);
};

/**
 * Permission-based component wrapper
 * Hides component if user doesn't have required permission
 */
export const PermissionGuard = ({ user, permissions, children, fallback = null }) => {
  if (!user) {
    return fallback;
  }

  // Admins have all permissions
  if (isAdmin(user)) {
    return children;
  }

  const userPermissions = user.permissions || [];
  const hasAccess = hasAnyPermission(userPermissions, permissions);

  return hasAccess ? children : fallback;
};

/**
 * Role-based component wrapper
 * Hides component if user doesn't have required role
 */
export const RoleGuard = ({ user, roles, children, fallback = null }) => {
  if (!user) {
    return fallback;
  }

  const hasAccess = hasRole(user, roles);

  return hasAccess ? children : fallback;
};

