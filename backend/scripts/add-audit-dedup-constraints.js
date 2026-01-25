/**
 * Add deduplication constraints for audits and audit_items.
 * Usage: node scripts/add-audit-dedup-constraints.js
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

const getOne = (dbInstance, sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const getAll = (dbInstance, sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

async function hasDuplicateAuditItems(dbInstance) {
  const duplicates = await getAll(
    dbInstance,
    `SELECT audit_id, item_id, COUNT(*) AS count
     FROM audit_items
     GROUP BY audit_id, item_id
     HAVING COUNT(*) > 1`
  );
  if (duplicates.length > 0) {
    console.warn('Duplicate audit_items detected (sample):', duplicates.slice(0, 10));
    return true;
  }
  return false;
}

async function addSqliteConstraints(dbInstance) {
  const columns = await getAll(dbInstance, 'PRAGMA table_info(audits)');
  const hasClientUuid = columns.some(col => col.name === 'client_audit_uuid');
  if (!hasClientUuid) {
    await runQuery(dbInstance, 'ALTER TABLE audits ADD COLUMN client_audit_uuid TEXT');
    console.log('Added audits.client_audit_uuid column');
  }

  const hasDupes = await hasDuplicateAuditItems(dbInstance);
  if (!hasDupes) {
    await runQuery(dbInstance, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_items_unique ON audit_items (audit_id, item_id)');
    console.log('Added unique index on audit_items (audit_id, item_id)');
  } else {
    console.warn('Skipped audit_items unique index due to duplicates. Run cleanup first.');
  }

  await runQuery(dbInstance, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_audits_client_uuid ON audits (client_audit_uuid)');
  console.log('Added unique index on audits (client_audit_uuid)');
}

async function addPostgresConstraints(dbInstance) {
  await runQuery(dbInstance, 'ALTER TABLE audits ADD COLUMN IF NOT EXISTS client_audit_uuid VARCHAR(100)');
  console.log('Ensured audits.client_audit_uuid column exists');

  const hasDupes = await hasDuplicateAuditItems(dbInstance);
  if (!hasDupes) {
    await runQuery(dbInstance, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_items_unique ON audit_items (audit_id, item_id)');
    console.log('Added unique index on audit_items (audit_id, item_id)');
  } else {
    console.warn('Skipped audit_items unique index due to duplicates. Run cleanup first.');
  }

  await runQuery(dbInstance, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_audits_client_uuid ON audits (client_audit_uuid)');
  console.log('Added unique index on audits (client_audit_uuid)');
}

async function addMysqlConstraints(dbInstance) {
  const col = await getOne(
    dbInstance,
    `SELECT COLUMN_NAME AS column_name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'audits'
       AND COLUMN_NAME = 'client_audit_uuid'`
  );
  if (!col) {
    await runQuery(dbInstance, 'ALTER TABLE audits ADD COLUMN client_audit_uuid VARCHAR(100) NULL');
    console.log('Added audits.client_audit_uuid column');
  }

  const hasDupes = await hasDuplicateAuditItems(dbInstance);
  if (!hasDupes) {
    const idx = await getOne(dbInstance, "SHOW INDEX FROM audit_items WHERE Key_name = 'uniq_audit_items'");
    if (!idx) {
      await runQuery(dbInstance, 'CREATE UNIQUE INDEX uniq_audit_items ON audit_items (audit_id, item_id)');
      console.log('Added unique index on audit_items (audit_id, item_id)');
    }
  } else {
    console.warn('Skipped audit_items unique index due to duplicates. Run cleanup first.');
  }

  const idxAudit = await getOne(dbInstance, "SHOW INDEX FROM audits WHERE Key_name = 'uniq_audits_client_uuid'");
  if (!idxAudit) {
    await runQuery(dbInstance, 'CREATE UNIQUE INDEX uniq_audits_client_uuid ON audits (client_audit_uuid)');
    console.log('Added unique index on audits (client_audit_uuid)');
  }
}

async function addSqlServerConstraints(dbInstance) {
  const col = await getOne(dbInstance, "SELECT COL_LENGTH('dbo.audits','client_audit_uuid') AS len");
  if (!col || !col.len) {
    await runQuery(dbInstance, 'ALTER TABLE [dbo].[audits] ADD [client_audit_uuid] NVARCHAR(100) NULL');
    console.log('Added audits.client_audit_uuid column');
  }

  const hasDupes = await hasDuplicateAuditItems(dbInstance);
  if (!hasDupes) {
    await runQuery(
      dbInstance,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_audit_items_unique' AND object_id = OBJECT_ID(N'[dbo].[audit_items]'))
       CREATE UNIQUE INDEX [idx_audit_items_unique] ON [dbo].[audit_items] ([audit_id], [item_id])`
    );
    console.log('Added unique index on audit_items (audit_id, item_id)');
  } else {
    console.warn('Skipped audit_items unique index due to duplicates. Run cleanup first.');
  }

  // Drop existing index if it exists (to recreate with filter)
  await runQuery(
    dbInstance,
    `IF EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_audits_client_uuid' AND object_id = OBJECT_ID(N'[dbo].[audits]'))
     DROP INDEX [idx_audits_client_uuid] ON [dbo].[audits]`
  );
  
  // Create filtered unique index that only applies to non-NULL values
  await runQuery(
    dbInstance,
    `CREATE UNIQUE INDEX [idx_audits_client_uuid] ON [dbo].[audits] ([client_audit_uuid])
     WHERE [client_audit_uuid] IS NOT NULL`
  );
  console.log('Added filtered unique index on audits (client_audit_uuid)');
}

async function main() {
  const dbInstance = await initDb();
  try {
    if (isSqlServer) {
      await addSqlServerConstraints(dbInstance);
    } else if (isPostgres) {
      await addPostgresConstraints(dbInstance);
    } else if (isMysql) {
      await addMysqlConstraints(dbInstance);
    } else {
      await addSqliteConstraints(dbInstance);
    }
    console.log('Audit dedup constraints applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to apply audit dedup constraints:', error.message);
    process.exit(1);
  }
}

main();
