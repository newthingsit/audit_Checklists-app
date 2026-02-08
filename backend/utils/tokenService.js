/**
 * Token Service — Short-lived access tokens + long-lived refresh tokens
 *
 * Access tokens : 15 minutes (stateless, carried in Authorization header)
 * Refresh tokens: 7 days    (stored in DB, single-use — rotated on every refresh)
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database-loader');
const logger = require('./logger');
const { JWT_SECRET } = require('../middleware/auth');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a cryptographically random refresh token string */
const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

/** Create a signed access (JWT) token */
const signAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

// ---------------------------------------------------------------------------
// Database helpers (promisified)
// ---------------------------------------------------------------------------

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    dbInstance.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    dbInstance.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

// ---------------------------------------------------------------------------
// Ensure refresh_tokens table exists
// ---------------------------------------------------------------------------

const ensureRefreshTokensTable = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked INTEGER DEFAULT 0
    )
  `);
  // Index for fast lookups
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`).catch(() => {});
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`).catch(() => {});
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Issue a new access + refresh token pair for the given user.
 * Stores the refresh token in the database.
 */
const issueTokenPair = async (user) => {
  await ensureRefreshTokensTable();

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();

  await dbRun(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

/**
 * Rotate a refresh token — validate the old one, revoke it, and return a new pair.
 * Returns null if the token is invalid / expired / already revoked.
 */
const rotateRefreshToken = async (oldToken) => {
  await ensureRefreshTokensTable();

  const row = await dbGet(
    'SELECT rt.*, u.id as uid, u.email, u.name, u.role FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = ? AND rt.revoked = 0',
    [oldToken]
  );

  if (!row) {
    logger.security('refresh_token_invalid', { token: oldToken.substring(0, 8) + '...' });
    return null;
  }

  // Check expiry
  if (new Date(row.expires_at) < new Date()) {
    await dbRun('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [row.id]);
    logger.security('refresh_token_expired', { userId: row.user_id });
    return null;
  }

  // Revoke the old token (single-use)
  await dbRun('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [row.id]);

  // Issue new pair
  const user = { id: row.uid, email: row.email, name: row.name, role: row.role };
  return issueTokenPair(user);
};

/**
 * Revoke all refresh tokens for a user (e.g. on password change / logout-all).
 */
const revokeAllForUser = async (userId) => {
  await ensureRefreshTokensTable();
  await dbRun('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
};

/**
 * Cleanup expired / revoked tokens (call periodically).
 */
const cleanup = async () => {
  await ensureRefreshTokensTable();
  const result = await dbRun(
    "DELETE FROM refresh_tokens WHERE revoked = 1 OR expires_at < datetime('now')"
  );
  if (result.changes > 0) {
    logger.info(`[TokenService] Cleaned up ${result.changes} expired/revoked refresh tokens`);
  }
};

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeAllForUser,
  cleanup,
  ACCESS_TOKEN_EXPIRY,
};
