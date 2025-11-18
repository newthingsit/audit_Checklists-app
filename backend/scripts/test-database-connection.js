/**
 * Test Database Connection Script
 * Tests connection to the configured database
 * 
 * Usage: node scripts/test-database-connection.js
 */

require('dotenv').config();
const db = require('../config/database-loader');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  console.log('='.repeat(60));
  
  try {
    // Initialize database
    await db.init();
    console.log('\n✅ Database connection successful!');
    
    // Get database instance
    const dbInstance = db.getDb();
    
    // Test query
    console.log('\n📊 Running test query...');
    
    if (process.env.DB_TYPE === 'mssql' || process.env.DB_TYPE === 'sqlserver' || process.env.MSSQL_SERVER) {
      // SQL Server
      const result = await dbInstance.query('SELECT @@VERSION as version');
      console.log('SQL Server Version:', result.rows[0].version);
      
      // Test table query
      const tables = await dbInstance.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      console.log(`\n📋 Found ${tables.rows.length} tables:`);
      tables.rows.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
      
    } else if (process.env.DB_TYPE === 'postgresql' || process.env.DATABASE_URL) {
      // PostgreSQL
      const result = await dbInstance.query('SELECT version() as version');
      console.log('PostgreSQL Version:', result.rows[0].version);
      
      // Test table query
      const tables = await dbInstance.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log(`\n📋 Found ${tables.rows.length} tables:`);
      tables.rows.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
    } else if (process.env.DB_TYPE === 'mysql') {
      // MySQL
      const [version] = await dbInstance.query('SELECT VERSION() as version');
      console.log('MySQL Version:', version[0].version);
      
      // Test table query
      const [tables] = await dbInstance.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [process.env.DB_NAME || 'audit_checklists']);
      console.log(`\n📋 Found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
      
    } else {
      // SQLite
      const version = await new Promise((resolve, reject) => {
        dbInstance.get('SELECT sqlite_version() as version', [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      console.log('SQLite Version:', version.version);
      
      // Test table query
      const tables = await new Promise((resolve, reject) => {
        dbInstance.all(`
          SELECT name 
          FROM sqlite_master 
          WHERE type='table' 
          ORDER BY name
        `, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log(`\n📋 Found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
    }
    
    console.log('\n✅ All tests passed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('  - Check your .env file configuration');
    console.error('  - Verify database server is running');
    console.error('  - Check database credentials');
    console.error('  - Ensure database exists');
    process.exit(1);
  } finally {
    // Close connection
    if (db.close) {
      await db.close();
    }
  }
}

// Run test
testConnection();

