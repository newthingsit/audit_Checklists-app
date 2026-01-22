/**
 * Cleanup duplicate audit_items rows.
 * Keeps the latest row per (audit_id, item_id) and deletes older duplicates.
 * Usage: node scripts/cleanup-duplicate-audit-items.js
 */

require('dotenv').config();
const db = require('../config/database-loader');

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver' || !!process.env.MSSQL_SERVER;
const isPostgres = dbType === 'postgresql' || dbType === 'postgres' || !!process.env.DATABASE_URL;
const isMysql = dbType === 'mysql';

async function initDb() {
  await db.init();
  return db.getDb();
}

const runQuery = (dbInstance, sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

const getAll = (dbInstance, sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

async function cleanupDuplicates(dbInstance) {
  if (isSqlServer) {
    await runQuery(
      dbInstance,
      `WITH ranked AS (
         SELECT id, audit_id, item_id,
                ROW_NUMBER() OVER (PARTITION BY audit_id, item_id ORDER BY id DESC) AS rn
         FROM audit_items
       )
       DELETE FROM ranked WHERE rn > 1`
    );
    return;
  }

  if (isPostgres) {
    await runQuery(
      dbInstance,
      `DELETE FROM audit_items a
       USING audit_items b
       WHERE a.audit_id = b.audit_id
         AND a.item_id = b.item_id
         AND a.id < b.id`
    );
    return;
  }

  if (isMysql) {
    await runQuery(
      dbInstance,
      `DELETE ai1 FROM audit_items ai1
       INNER JOIN audit_items ai2
         ON ai1.audit_id = ai2.audit_id
        AND ai1.item_id = ai2.item_id
        AND ai1.id < ai2.id`
    );
    return;
  }

  // SQLite
  await runQuery(
    dbInstance,
    `DELETE FROM audit_items
     WHERE id NOT IN (
       SELECT MAX(id) FROM audit_items GROUP BY audit_id, item_id
     )`
  );
}

async function main() {
  const dbInstance = await initDb();
  try {
    const duplicates = await getAll(
      dbInstance,
      `SELECT audit_id, item_id, COUNT(*) AS count
       FROM audit_items
       GROUP BY audit_id, item_id
       HAVING COUNT(*) > 1`
    );
    if (duplicates.length === 0) {
      console.log('No duplicate audit_items found.');
      process.exit(0);
    }
    console.log(`Found ${duplicates.length} duplicate groups. Cleaning up...`);
    await cleanupDuplicates(dbInstance);
    console.log('Duplicate audit_items cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to cleanup duplicate audit_items:', error.message);
    process.exit(1);
  }
}

main();
