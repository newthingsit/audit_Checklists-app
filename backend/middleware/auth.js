const jwt = require('jsonwebtoken');
const db = require('../config/database-loader');

// Require JWT_SECRET in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: JWT_SECRET environment variable is required in production!');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET not set. Using default (INSECURE - for development only)');
    console.warn('Set JWT_SECRET environment variable for production use!');
  }
}
const SECRET = JWT_SECRET || 'your-secret-key-change-in-production-DEVELOPMENT-ONLY';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    
    // If role is missing from token (old tokens), fetch it from database
    if (!req.user.role) {
      const dbInstance = db.getDb();
      dbInstance.get('SELECT role FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
          return res.status(401).json({ error: 'User not found' });
        }
        req.user.role = user.role || 'user';
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = { authenticate, JWT_SECRET: SECRET };

