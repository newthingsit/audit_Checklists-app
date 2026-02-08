/**
 * Promisified wrappers around the callback-based SQLite / MSSQL database API.
 *
 * Usage:
 *   const { dbGet, dbAll, dbRun } = require('../utils/dbAsync');
 *
 *   const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
 *   const rows = await dbAll('SELECT * FROM audits WHERE status = ?', ['completed']);
 *   const { lastID, changes } = await dbRun('INSERT INTO users (name) VALUES (?)', ['Alice']);
 */

const db = require('../config/database-loader');

/**
 * Run a query that returns a single row (SELECT … LIMIT 1).
 * Resolves with the row object or undefined.
 */
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const instance = db.getDb();
    instance.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Run a query that returns multiple rows.
 * Resolves with an array (possibly empty).
 */
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const instance = db.getDb();
    instance.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

/**
 * Run a write query (INSERT, UPDATE, DELETE, CREATE TABLE, etc.).
 * Resolves with { lastID, changes }.
 */
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const instance = db.getDb();
    instance.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

module.exports = { dbGet, dbAll, dbRun };
