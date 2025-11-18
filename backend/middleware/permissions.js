const { authenticate } = require('./auth');

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

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      next();
    });
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is admin or manager
const requireAdminOrManager = requireRole('admin', 'manager');

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrManager
};

