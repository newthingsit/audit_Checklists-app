/**
 * Data Migration Script: SQLite to MySQL
 * 
 * This script migrates all data from SQLite to MySQL
 * Run this after the MySQL schema has been created
 * 
 * Usage: node scripts/migrate-data-sqlite-to-mysql.js
 */

const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
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
let mysqlConnection = null;

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

    // Connect to MySQL
    const mysqlConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'audit_checklists',
      charset: 'utf8mb4'
    };

    mysql.createConnection(mysqlConfig)
      .then(conn => {
        mysqlConnection = conn;
        console.log('✓ Connected to MySQL database');
        resolve();
      })
      .catch(err => {
        console.error('Error connecting to MySQL:', err);
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
    
    // Build INSERT query
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.join(', ');
    const insertQuery = `INSERT IGNORE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Insert rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          const values = columns.map(col => {
            let value = row[col];
            
            // Handle NULL values
            if (value === null || value === undefined) {
              return null;
            }
            
            // Convert SQLite INTEGER to number
            if (typeof value === 'number') {
              return value;
            }
            
            // Convert SQLite TEXT to string
            if (typeof value === 'string') {
              return value;
            }
            
            // Convert SQLite BOOLEAN (0/1) to boolean
            if (value === 0 || value === 1) {
              return value === 1;
            }
            
            return value;
          });

          await mysqlConnection.execute(insertQuery, values);
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
      const [mysqlRows] = await mysqlConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      
      const sqliteCountNum = sqliteCount[0]?.count || 0;
      const mysqlCountNum = mysqlRows[0]?.count || 0;
      
      results[table] = {
        sqlite: sqliteCountNum,
        mysql: mysqlCountNum,
        match: sqliteCountNum === mysqlCountNum
      };
      
      if (sqliteCountNum === mysqlCountNum) {
        console.log(`  ✓ ${table}: ${mysqlCountNum} rows (match)`);
      } else {
        console.log(`  ⚠️  ${table}: SQLite=${sqliteCountNum}, MySQL=${mysqlCountNum} (mismatch)`);
      }
    } catch (err) {
      console.error(`  ❌ Error verifying ${table}:`, err.message);
      results[table] = { error: err.message };
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting SQLite to MySQL Migration\n');
  console.log('='.repeat(60));
  
  try {
    // Initialize connections
    await initConnections();
    
    // Verify MySQL schema exists
    console.log('\n📋 Verifying MySQL schema...');
    const [tables] = await mysqlConnection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'audit_checklists']);
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    const missingTables = MIGRATION_ORDER.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.error(`❌ Missing tables in MySQL: ${missingTables.join(', ')}`);
      console.error('Please run the schema migration first!');
      process.exit(1);
    }
    
    console.log('✓ All required tables exist');
    
    // Clear existing data (optional - comment out if you want to append)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('\n🗑️  Clearing existing data...');
      // Disable foreign key checks temporarily
      await mysqlConnection.execute('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of MIGRATION_ORDER.reverse()) {
        await mysqlConnection.execute(`TRUNCATE TABLE ${table}`);
      }
      await mysqlConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
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
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('✓ MySQL connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { main };

