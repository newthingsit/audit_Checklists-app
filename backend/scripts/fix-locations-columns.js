/**
 * Script to add missing columns (region, district) to the locations table in SQL Server
 * Run this script if you see "Invalid column name 'region'" errors
 * 
 * Usage: node scripts/fix-locations-columns.js
 */

require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER || process.env.DB_HOST || 'localhost',
  database: process.env.MSSQL_DATABASE || process.env.DB_NAME || 'audit_db',
  user: process.env.MSSQL_USER || process.env.DB_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function fixLocationsTable() {
  let pool;
  
  try {
    console.log('Connecting to SQL Server...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');
    
    // Check current columns in locations table
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'locations'
    `);
    
    const existingColumns = checkColumns.recordset.map(r => r.COLUMN_NAME.toLowerCase());
    console.log('Existing columns:', existingColumns.join(', '));
    
    // Add region column if missing
    if (!existingColumns.includes('region')) {
      console.log('Adding region column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] 
        ADD [region] NVARCHAR(255) NULL
      `);
      console.log('✅ region column added successfully');
    } else {
      console.log('✅ region column already exists');
    }
    
    // Add district column if missing
    if (!existingColumns.includes('district')) {
      console.log('Adding district column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] 
        ADD [district] NVARCHAR(255) NULL
      `);
      console.log('✅ district column added successfully');
    } else {
      console.log('✅ district column already exists');
    }
    
    // Add parent_id column if missing
    if (!existingColumns.includes('parent_id')) {
      console.log('Adding parent_id column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] 
        ADD [parent_id] INT NULL
      `);
      console.log('✅ parent_id column added successfully');
    } else {
      console.log('✅ parent_id column already exists');
    }
    
    // Add latitude column if missing
    if (!existingColumns.includes('latitude')) {
      console.log('Adding latitude column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] 
        ADD [latitude] DECIMAL(10, 8) NULL
      `);
      console.log('✅ latitude column added successfully');
    } else {
      console.log('✅ latitude column already exists');
    }
    
    // Add longitude column if missing
    if (!existingColumns.includes('longitude')) {
      console.log('Adding longitude column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] 
        ADD [longitude] DECIMAL(11, 8) NULL
      `);
      console.log('✅ longitude column added successfully');
    } else {
      console.log('✅ longitude column already exists');
    }
    
    console.log('\n✅ All columns verified/added successfully!');
    console.log('Please restart the backend server for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ELOGIN') {
      console.log('\nCheck your SQL Server credentials in .env file:');
      console.log('  MSSQL_SERVER=' + (process.env.MSSQL_SERVER || 'not set'));
      console.log('  MSSQL_DATABASE=' + (process.env.MSSQL_DATABASE || 'not set'));
      console.log('  MSSQL_USER=' + (process.env.MSSQL_USER || 'not set'));
    }
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

fixLocationsTable();

