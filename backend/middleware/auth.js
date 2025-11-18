const jwt = require('jsonwebtoken');
const db = require('../config/database-loader');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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

module.exports = { authenticate, JWT_SECRET };

