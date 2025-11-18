/**
 * Smart Database Loader
 * Automatically selects the appropriate database driver based on environment configuration
 * 
 * Priority:
 * 1. DB_TYPE environment variable (sqlite, postgresql, mysql)
 * 2. DATABASE_URL (if present, assumes PostgreSQL)
 * 3. MySQL connection variables (DB_HOST, DB_USER, etc.)
 * 4. Defaults to SQLite
 */

require('dotenv').config();

const dbType = (process.env.DB_TYPE || '').toLowerCase();

let dbModule = null;

// Determine which database to use
if (dbType === 'mssql' || dbType === 'sqlserver' || process.env.MSSQL_SERVER) {
  // SQL Server
  console.log('📊 Loading SQL Server database driver...');
  try {
    dbModule = require('./database-mssql');
    console.log('✅ SQL Server driver loaded');
  } catch (error) {
    console.error('❌ Error loading SQL Server driver:', error.message);
    console.log('⚠️  Falling back to SQLite...');
    dbModule = require('./database');
  }
} else if (dbType === 'postgresql' || dbType === 'postgres' || process.env.DATABASE_URL) {
  // PostgreSQL
  console.log('📊 Loading PostgreSQL database driver...');
  try {
    dbModule = require('./database-pg');
    console.log('✅ PostgreSQL driver loaded');
  } catch (error) {
    console.error('❌ Error loading PostgreSQL driver:', error.message);
    console.log('⚠️  Falling back to SQLite...');
    dbModule = require('./database');
  }
} else if (dbType === 'mysql' || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME && !process.env.MSSQL_SERVER && dbType !== 'mssql' && dbType !== 'sqlserver')) {
  // MySQL
  console.log('📊 Loading MySQL database driver...');
  try {
    dbModule = require('./database-mysql');
    console.log('✅ MySQL driver loaded');
  } catch (error) {
    console.error('❌ Error loading MySQL driver:', error.message);
    console.log('⚠️  Falling back to SQLite...');
    dbModule = require('./database');
  }
} else {
  // SQLite (default)
  console.log('📊 Loading SQLite database driver...');
  dbModule = require('./database');
  console.log('✅ SQLite driver loaded');
}

// Export with unified interface
if (!dbModule) {
  throw new Error('Database module failed to load');
}

if (!dbModule.getDb) {
  throw new Error('Database module does not have getDb method');
}

module.exports = {
  init: dbModule.init,
  getDb: dbModule.getDb,
  close: dbModule.close || (() => Promise.resolve())
};

