/**
 * Backfill audits.client_audit_uuid for existing rows.
 * Usage: node scripts/backfill-client-audit-uuid.js
 * Optional env:
 *  - BACKFILL_BATCH_SIZE (default: 500)
 */

require('dotenv').config();
const crypto = require('crypto');
const db = require('../config/database-loader');

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver' || !!process.env.MSSQL_SERVER;
const isPostgres = dbType === 'postgresql' || dbType === 'postgres' || !!process.env.DATABASE_URL;
const isMysql = dbType === 'mysql';
const batchSize = Math.max(1, parseInt(process.env.BACKFILL_BATCH_SIZE || '500', 10));

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

const getSelectQuery = () => {
  if (isSqlServer) {
    return `SELECT TOP (${batchSize}) id FROM audits WHERE client_audit_uuid IS NULL OR client_audit_uuid = '' ORDER BY id`;
  }
  return `SELECT id FROM audits WHERE client_audit_uuid IS NULL OR client_audit_uuid = '' LIMIT ${batchSize}`;
};

const getIdFromRow = (row) => {
  if (!row) return null;
  if (row.id !== undefined) return row.id;
  if (row.ID !== undefined) return row.ID;
  const values = Object.values(row);
  return values.length > 0 ? values[0] : null;
};

async function backfill() {
  const dbInstance = await initDb();
  let totalUpdated = 0;

  while (true) {
    const rows = await getAll(dbInstance, getSelectQuery());
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const id = getIdFromRow(row);
      if (!id) continue;
      const uuid = crypto.randomUUID();
      await runQuery(
        dbInstance,
        "UPDATE audits SET client_audit_uuid = ? WHERE id = ? AND (client_audit_uuid IS NULL OR client_audit_uuid = '')",
        [uuid, id]
      );
      totalUpdated += 1;
    }

    console.log(`Backfilled ${totalUpdated} audit(s) so far...`);
  }

  console.log(`Backfill complete. Updated ${totalUpdated} audit(s).`);
}

backfill()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Backfill failed:', error.message);
    try {
      await db.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
