/**
 * SQL Server Database Setup Script
 * Creates the database if it doesn't exist
 * 
 * Usage: node scripts/setup-sql-server-db.js
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
  port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
  user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
  password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || true,
    enableArithAbort: true
  }
};

const databaseName = process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists';

async function setupDatabase() {
  console.log('🚀 Setting up SQL Server database...\n');
  console.log('='.repeat(60));
  
  try {
    // Connect to master database first
    console.log('📡 Connecting to SQL Server...');
    const pool = await sql.connect({
      ...config,
      database: 'master' // Connect to master to create new database
    });
    
    console.log('✅ Connected to SQL Server');
    
    // Check if database exists
    console.log(`\n🔍 Checking if database '${databaseName}' exists...`);
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = '${databaseName}'
    `);
    
    if (dbCheck.recordset.length > 0) {
      console.log(`✅ Database '${databaseName}' already exists`);
    } else {
      console.log(`📦 Creating database '${databaseName}'...`);
      await pool.request().query(`
        CREATE DATABASE [${databaseName}]
      `);
      console.log(`✅ Database '${databaseName}' created successfully`);
    }
    
    // Close connection
    await pool.close();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database setup completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Update DB_PASSWORD in .env file with your actual password');
    console.log('   2. Run: node scripts/test-database-connection.js');
    console.log('   3. Start the application: npm start');
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify SQL Server is running');
    console.error('   - Check your connection credentials in .env');
    console.error('   - Ensure SQL Server Authentication is enabled');
    console.error('   - Check firewall settings');
    process.exit(1);
  }
}

// Run setup
setupDatabase();

