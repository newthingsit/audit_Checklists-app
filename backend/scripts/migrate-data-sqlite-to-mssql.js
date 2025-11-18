/**
 * Data Migration Script: SQLite to SQL Server
 * 
 * This script migrates all data from SQLite to SQL Server
 * Run this after the SQL Server schema has been created
 * 
 * Usage: node scripts/migrate-data-sqlite-to-mssql.js
 */

const sqlite3 = require('sqlite3').verbose();
const sql = require('mssql');
const path = require('path');
require('dotenv').config();

const sqlitePath = path.join(__dirname, '../../data/audit.db');

// Table migration order (respects foreign key constraints)
const MIGRATION_ORDER = [
  'roles',
  'users',
  'checklist_templates',
  'checklist_items',
  'checklist_item_options',
  'locations',
  'audits',
  'audit_items',
  'action_items',
  'scheduled_audits'
];

let sqliteDb = null;
let mssqlPool = null;

async function initConnections() {
  return new Promise((resolve, reject) => {
    // Connect to SQLite
    sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
      if (err) {
        console.error('Error connecting to SQLite:', err);
        return reject(err);
      }
      console.log('✓ Connected to SQLite database');
    });

    // Connect to SQL Server
    const mssqlConfig = {
      server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
      port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
      database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
      user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
      password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || true,
        enableArithAbort: true
      }
    };

    sql.connect(mssqlConfig)
      .then(pool => {
        mssqlPool = pool;
        console.log('✓ Connected to SQL Server database');
        resolve();
      })
      .catch(err => {
        console.error('Error connecting to SQL Server:', err);
        reject(err);
      });
  });
}

function sqliteQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}...`);
  
  try {
    // Get all rows from SQLite
    const rows = await sqliteQuery(`SELECT * FROM ${tableName}`);
    
    if (rows.length === 0) {
      console.log(`  ⚠️  Table ${tableName} is empty, skipping...`);
      return { table: tableName, count: 0, errors: [] };
    }

    console.log(`  Found ${rows.length} rows to migrate`);

    // Get column names
    const columns = Object.keys(rows[0]);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Insert rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          const request = mssqlPool.request();
          
          // Build column and value lists
          const columnNames = columns.join(', ');
          const valuePlaceholders = columns.map((_, idx) => `@param${idx}`).join(', ');
          
          // Add parameters
          columns.forEach((col, idx) => {
            let value = row[col];
            
            // Handle NULL values
            if (value === null || value === undefined) {
              request.input(`param${idx}`, sql.NVarChar, null);
            } else if (typeof value === 'number') {
              request.input(`param${idx}`, sql.Int, value);
            } else if (typeof value === 'boolean') {
              request.input(`param${idx}`, sql.Bit, value ? 1 : 0);
            } else {
              request.input(`param${idx}`, sql.NVarChar, String(value));
            }
          });
          
          const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`;
          
          await request.query(insertQuery);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push({
            row: row.id || 'unknown',
            error: err.message
          });
          console.error(`  ❌ Error inserting row ${row.id || 'unknown'}:`, err.message);
        }
      }
      
      if (i % 1000 === 0) {
        console.log(`  Progress: ${Math.min(i + batchSize, rows.length)}/${rows.length} rows`);
      }
    }

    console.log(`  ✓ Migrated ${successCount} rows, ${errorCount} errors`);
    
    return { table: tableName, count: successCount, errors };
  } catch (err) {
    console.error(`  ❌ Error migrating table ${tableName}:`, err.message);
    return { table: tableName, count: 0, errors: [{ error: err.message }] };
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const results = {};
  
  for (const table of MIGRATION_ORDER) {
    try {
      const sqliteCount = await sqliteQuery(`SELECT COUNT(*) as count FROM ${table}`);
      const mssqlResult = await mssqlPool.request().query(`SELECT COUNT(*) as count FROM ${table}`);
      
      const sqliteCountNum = sqliteCount[0]?.count || 0;
      const mssqlCountNum = mssqlResult.recordset[0]?.count || 0;
      
      results[table] = {
        sqlite: sqliteCountNum,
        mssql: mssqlCountNum,
        match: sqliteCountNum === mssqlCountNum
      };
      
      if (sqliteCountNum === mssqlCountNum) {
        console.log(`  ✓ ${table}: ${mssqlCountNum} rows (match)`);
      } else {
        console.log(`  ⚠️  ${table}: SQLite=${sqliteCountNum}, SQL Server=${mssqlCountNum} (mismatch)`);
      }
    } catch (err) {
      console.error(`  ❌ Error verifying ${table}:`, err.message);
      results[table] = { error: err.message };
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting SQLite to SQL Server Migration\n');
  console.log('='.repeat(60));
  
  try {
    // Initialize connections
    await initConnections();
    
    // Verify SQL Server schema exists
    console.log('\n📋 Verifying SQL Server schema...');
    const schemaCheck = await mssqlPool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    const existingTables = schemaCheck.recordset.map(r => r.TABLE_NAME.toLowerCase());
    const missingTables = MIGRATION_ORDER.filter(t => !existingTables.includes(t.toLowerCase()));
    
    if (missingTables.length > 0) {
      console.error(`❌ Missing tables in SQL Server: ${missingTables.join(', ')}`);
      console.error('Please run the schema migration first!');
      process.exit(1);
    }
    
    console.log('✓ All required tables exist');
    
    // Clear existing data (optional - comment out if you want to append)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('\n🗑️  Clearing existing data...');
      // Disable foreign key checks temporarily
      for (const table of MIGRATION_ORDER.reverse()) {
        await mssqlPool.request().query(`TRUNCATE TABLE ${table}`);
      }
      console.log('✓ Data cleared');
    }
    
    // Migrate tables in order
    const migrationResults = [];
    for (const table of MIGRATION_ORDER) {
      const result = await migrateTable(table);
      migrationResults.push(result);
    }
    
    // Verify migration
    const verification = await verifyMigration();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary\n');
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    migrationResults.forEach(result => {
      totalMigrated += result.count;
      totalErrors += result.errors.length;
      console.log(`${result.table}: ${result.count} rows, ${result.errors.length} errors`);
    });
    
    console.log(`\nTotal: ${totalMigrated} rows migrated, ${totalErrors} errors`);
    
    // Check for mismatches
    const mismatches = Object.entries(verification)
      .filter(([_, v]) => v.match === false);
    
    if (mismatches.length > 0) {
      console.log('\n⚠️  Data count mismatches detected!');
      console.log('Please review the verification results above.');
    } else {
      console.log('\n✓ All data counts match!');
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (sqliteDb) {
      sqliteDb.close();
      console.log('\n✓ SQLite connection closed');
    }
    if (mssqlPool) {
      await mssqlPool.close();
      console.log('✓ SQL Server connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { main };

