const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

// Require JWT_SECRET in production; generate ephemeral key in development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL: JWT_SECRET environment variable is required in production!');
    process.exit(1);
  } else {
    logger.warn('JWT_SECRET not set. Generating ephemeral key (INSECURE - development only)');
    logger.warn('Set JWT_SECRET in .env for consistent sessions across restarts');
  }
}
const SECRET = JWT_SECRET || crypto.randomBytes(64).toString('hex');

const unauthorized = (res, req, code, message) => {
  return res.status(401).json({
    error: 'Unauthorized',
    code,
    message,
    requestId: req.requestId || null
  });
};

const getBearerToken = (req) => {
  const header = req.header('Authorization') || req.headers.authorization || '';
  if (!header) return null;
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

const authenticate = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return unauthorized(res, req, 'TOKEN_MISSING', 'Access token is required');
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    
    // If role is missing from token (old tokens), fetch it from database
    if (!req.user.role) {
      const dbInstance = db.getDb();
      dbInstance.get('SELECT role FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
          return unauthorized(res, req, 'USER_NOT_FOUND', 'User associated with token was not found');
        }
        req.user.role = user.role || 'user';
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    const isExpired = error && error.name === 'TokenExpiredError';
    return unauthorized(
      res,
      req,
      isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      isExpired ? 'Access token has expired' : 'Access token is invalid'
    );
  }
};

module.exports = { authenticate, JWT_SECRET: SECRET };

