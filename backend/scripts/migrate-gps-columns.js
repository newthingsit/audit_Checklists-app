/**
 * Manual Migration Script for GPS Location Columns
 * 
 * This script ensures GPS columns are added to:
 * - audits table (gps_latitude, gps_longitude, gps_accuracy, gps_timestamp, location_verified)
 * - locations table (latitude, longitude)
 * 
 * Usage:
 *   node scripts/migrate-gps-columns.js
 */

const path = require('path');
const fs = require('fs');

// Determine database type
const dbType = process.env.DB_TYPE || 'sqlite';

console.log('📍 GPS Location Columns Migration Script');
console.log('==========================================\n');
console.log(`Database Type: ${dbType.toUpperCase()}\n`);

if (dbType === 'mssql' || dbType === 'sqlserver') {
  // SQL Server migration
  const sql = require('mssql');
  
  const runMigration = async () => {
    try {
      const config = {
        server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
        port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
        database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
        user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
        password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
        options: {
          encrypt: process.env.MSSQL_ENCRYPT === 'true',
          trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || true,
          enableArithAbort: true,
        },
      };

      console.log('Connecting to SQL Server...');
      const pool = await sql.connect(config);
      console.log('✅ Connected to SQL Server\n');

      const request = pool.request();

      // Check and add columns to locations table
      console.log('Checking locations table...');
      const locationsCheck = await request.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'locations'
      `);
      
      const locationColumns = locationsCheck.recordset.map(r => r.COLUMN_NAME);
      console.log(`Found ${locationColumns.length} columns in locations table`);

      if (!locationColumns.includes('latitude')) {
        console.log('  ➕ Adding latitude column...');
        await request.query(`
          ALTER TABLE [dbo].[locations] 
          ADD [latitude] DECIMAL(10, 8) NULL;
        `);
        console.log('  ✅ latitude column added');
      } else {
        console.log('  ✓ latitude column already exists');
      }

      if (!locationColumns.includes('longitude')) {
        console.log('  ➕ Adding longitude column...');
        await request.query(`
          ALTER TABLE [dbo].[locations] 
          ADD [longitude] DECIMAL(11, 8) NULL;
        `);
        console.log('  ✅ longitude column added');
      } else {
        console.log('  ✓ longitude column already exists');
      }

      // Check and add columns to audits table
      console.log('\nChecking audits table...');
      const auditsCheck = await request.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'audits'
      `);
      
      const auditColumns = auditsCheck.recordset.map(r => r.COLUMN_NAME);
      console.log(`Found ${auditColumns.length} columns in audits table`);

      const gpsColumns = [
        { name: 'gps_latitude', type: 'DECIMAL(10, 8)' },
        { name: 'gps_longitude', type: 'DECIMAL(11, 8)' },
        { name: 'gps_accuracy', type: 'FLOAT' },
        { name: 'gps_timestamp', type: 'DATETIME' },
        { name: 'location_verified', type: 'BIT DEFAULT 0' },
      ];

      for (const col of gpsColumns) {
        if (!auditColumns.includes(col.name)) {
          console.log(`  ➕ Adding ${col.name} column...`);
          await request.query(`
            ALTER TABLE [dbo].[audits] 
            ADD [${col.name}] ${col.type} NULL;
          `);
          console.log(`  ✅ ${col.name} column added`);
        } else {
          console.log(`  ✓ ${col.name} column already exists`);
        }
      }

      console.log('\n✅ Migration completed successfully!');
      await pool.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  };

  runMigration();

} else {
  // SQLite migration
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../data/audit.db');

  console.log('Connecting to SQLite database...');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      process.exit(1);
    }
    console.log('✅ Connected to SQLite database\n');
  });

  // Check and add columns to locations table
  console.log('Checking locations table...');
  db.all(`PRAGMA table_info(locations)`, (err, columns) => {
    if (err) {
      console.error('❌ Error checking locations table:', err);
      db.close();
      process.exit(1);
    }

    const columnNames = columns.map(col => col.name);
    console.log(`Found ${columnNames.length} columns in locations table`);

    if (!columnNames.includes('latitude')) {
      console.log('  ➕ Adding latitude column...');
      db.run(`ALTER TABLE locations ADD COLUMN latitude REAL`, (err) => {
        if (err) {
          console.error('  ❌ Error adding latitude:', err.message);
        } else {
          console.log('  ✅ latitude column added');
        }
      });
    } else {
      console.log('  ✓ latitude column already exists');
    }

    if (!columnNames.includes('longitude')) {
      console.log('  ➕ Adding longitude column...');
      db.run(`ALTER TABLE locations ADD COLUMN longitude REAL`, (err) => {
        if (err) {
          console.error('  ❌ Error adding longitude:', err.message);
        } else {
          console.log('  ✅ longitude column added');
        }
      });
    } else {
      console.log('  ✓ longitude column already exists');
    }

    // Check and add columns to audits table
    console.log('\nChecking audits table...');
    db.all(`PRAGMA table_info(audits)`, (err, auditColumns) => {
      if (err) {
        console.error('❌ Error checking audits table:', err);
        db.close();
        process.exit(1);
      }

      const auditColumnNames = auditColumns.map(col => col.name);
      console.log(`Found ${auditColumnNames.length} columns in audits table`);

      const gpsColumns = [
        { name: 'gps_latitude', type: 'REAL' },
        { name: 'gps_longitude', type: 'REAL' },
        { name: 'gps_accuracy', type: 'REAL' },
        { name: 'gps_timestamp', type: 'DATETIME' },
        { name: 'location_verified', type: 'BOOLEAN DEFAULT 0' },
      ];

      let completed = 0;
      const total = gpsColumns.length;

      gpsColumns.forEach((col) => {
        if (!auditColumnNames.includes(col.name)) {
          console.log(`  ➕ Adding ${col.name} column...`);
          db.run(`ALTER TABLE audits ADD COLUMN ${col.name} ${col.type}`, (err) => {
            if (err) {
              console.error(`  ❌ Error adding ${col.name}:`, err.message);
            } else {
              console.log(`  ✅ ${col.name} column added`);
            }
            completed++;
            if (completed === total) {
              console.log('\n✅ Migration completed successfully!');
              db.close();
              process.exit(0);
            }
          });
        } else {
          console.log(`  ✓ ${col.name} column already exists`);
          completed++;
          if (completed === total) {
            console.log('\n✅ Migration completed successfully!');
            db.close();
            process.exit(0);
          }
        }
      });
    });
  });
}

