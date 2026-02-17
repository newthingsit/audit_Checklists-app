#!/usr/bin/env node
/**
 * Ensure legacy audits schema includes columns required by modern create/update flows.
 *
 * Usage:
 *   node scripts/migrate-audits-columns.js
 */

const db = require('../config/database-loader');

const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

const REQUIRED_AUDIT_COLUMNS = [
  { name: 'location_id', sqliteType: 'INTEGER', sqlServerType: 'INT NULL' },
  { name: 'team_id', sqliteType: 'INTEGER', sqlServerType: 'INT NULL' },
  { name: 'scheduled_audit_id', sqliteType: 'INTEGER', sqlServerType: 'INT NULL' },
  { name: 'gps_latitude', sqliteType: 'REAL', sqlServerType: 'DECIMAL(10, 8) NULL' },
  { name: 'gps_longitude', sqliteType: 'REAL', sqlServerType: 'DECIMAL(11, 8) NULL' },
  { name: 'gps_accuracy', sqliteType: 'REAL', sqlServerType: 'FLOAT NULL' },
  { name: 'gps_timestamp', sqliteType: 'DATETIME', sqlServerType: 'DATETIME NULL' },
  { name: 'location_verified', sqliteType: 'BOOLEAN DEFAULT 0', sqlServerType: 'BIT NOT NULL CONSTRAINT DF_audits_location_verified DEFAULT 0' },
  { name: 'client_audit_uuid', sqliteType: 'TEXT', sqlServerType: 'NVARCHAR(100) NULL' },
  { name: 'audit_category', sqliteType: 'TEXT', sqlServerType: 'NVARCHAR(255) NULL' },
  { name: 'original_scheduled_date', sqliteType: 'DATETIME', sqlServerType: 'DATETIME NULL' },
  { name: 'has_critical_failure', sqliteType: 'BOOLEAN DEFAULT 0', sqlServerType: 'BIT NOT NULL CONSTRAINT DF_audits_has_critical_failure DEFAULT 0' },
  { name: 'weighted_score', sqliteType: 'REAL', sqlServerType: 'FLOAT NULL' },
];

let dbInstance = null;

const queryAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });

const ensureTableExists = async () => {
  if (isSqlServer) {
    const rows = await queryAll(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'audits'
    `);
    return rows.length > 0;
  }

  const rows = await queryAll("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audits'");
  return rows.length > 0;
};

const getExistingColumns = async () => {
  if (isSqlServer) {
    const rows = await queryAll(`
      SELECT COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'audits'
    `);
    return new Set(rows.map((row) => row.name));
  }

  const rows = await queryAll('PRAGMA table_info(audits)');
  return new Set(rows.map((row) => row.name));
};

const addMissingColumn = async (column) => {
  if (isSqlServer) {
    await run(`ALTER TABLE [dbo].[audits] ADD [${column.name}] ${column.sqlServerType}`);
    return;
  }
  await run(`ALTER TABLE audits ADD COLUMN ${column.name} ${column.sqliteType}`);
};

const ensureClientAuditUuidUniqueIndex = async () => {
  if (isSqlServer) {
    await run(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'idx_audits_client_uuid' AND object_id = OBJECT_ID('dbo.audits')
      )
      CREATE UNIQUE INDEX idx_audits_client_uuid ON [dbo].[audits]([client_audit_uuid])
      WHERE [client_audit_uuid] IS NOT NULL
    `);
    return;
  }

  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_audits_client_uuid ON audits (client_audit_uuid)');
};

async function main() {
  try {
    await db.init();
    dbInstance = db.getDb();

    console.log('🔧 Audits Columns Migration');
    console.log('===========================');
    console.log(`Database type: ${isSqlServer ? 'SQL Server' : 'SQLite'}\n`);

    const hasAuditsTable = await ensureTableExists();
    if (!hasAuditsTable) {
      console.log('ℹ️  Table audits does not exist yet. Initialize database first.');
      process.exit(0);
    }

    const existingColumns = await getExistingColumns();
    const missing = REQUIRED_AUDIT_COLUMNS.filter((column) => !existingColumns.has(column.name));

    if (missing.length === 0) {
      console.log('✅ audits table already has all required columns.');
    } else {
      console.log(`Found ${missing.length} missing column(s): ${missing.map((c) => c.name).join(', ')}`);
      for (const column of missing) {
        try {
          await addMissingColumn(column);
          console.log(`  ✅ Added column: ${column.name}`);
        } catch (error) {
          console.log(`  ⚠️  Could not add column ${column.name}: ${error.message}`);
        }
      }
    }

    try {
      await ensureClientAuditUuidUniqueIndex();
      console.log('✅ Ensured unique index on client_audit_uuid');
    } catch (error) {
      console.log(`⚠️  Could not ensure idx_audits_client_uuid: ${error.message}`);
    }

    console.log('\nDone.');
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    try {
      await db.close();
    } catch (closeError) {
      // ignore close errors in migration script
    }
    process.exit(1);
  }
}

main();
