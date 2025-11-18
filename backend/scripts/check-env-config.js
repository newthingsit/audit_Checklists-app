/**
 * Check Environment Configuration
 * Shows which database will be selected based on current .env settings
 */

require('dotenv').config();

console.log('🔍 Checking environment configuration...\n');
console.log('='.repeat(60));

const dbType = (process.env.DB_TYPE || '').toLowerCase();

console.log('Environment Variables:');
console.log(`  DB_TYPE: ${process.env.DB_TYPE || '(not set)'}`);
console.log(`  DB_HOST: ${process.env.DB_HOST || '(not set)'}`);
console.log(`  DB_PORT: ${process.env.DB_PORT || '(not set)'}`);
console.log(`  DB_NAME: ${process.env.DB_NAME || '(not set)'}`);
console.log(`  DB_USER: ${process.env.DB_USER || '(not set)'}`);
console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(not set)'}`);
console.log(`  MSSQL_SERVER: ${process.env.MSSQL_SERVER || '(not set)'}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '***' : '(not set)'}`);

console.log('\n' + '='.repeat(60));
console.log('Database Detection Logic:\n');

if (dbType === 'mssql' || dbType === 'sqlserver' || process.env.MSSQL_SERVER) {
  console.log('✅ Will use: SQL Server');
  console.log('   Reason: DB_TYPE=mssql or MSSQL_SERVER is set');
} else if (dbType === 'postgresql' || dbType === 'postgres' || process.env.DATABASE_URL) {
  console.log('✅ Will use: PostgreSQL');
  console.log('   Reason: DB_TYPE=postgresql or DATABASE_URL is set');
} else if (dbType === 'mysql' || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME && !process.env.MSSQL_SERVER)) {
  console.log('✅ Will use: MySQL');
  console.log('   Reason: DB_TYPE=mysql or DB_HOST/DB_USER/DB_NAME are set');
} else {
  console.log('✅ Will use: SQLite (default)');
  console.log('   Reason: No database configuration found');
}

console.log('\n' + '='.repeat(60));
console.log('💡 To use SQL Server, ensure your .env file has:');
console.log('   DB_TYPE=mssql');
console.log('   DB_HOST=localhost\\SQLEXPRESS');
console.log('   DB_NAME=audit_checklists');
console.log('   DB_USER=sa');
console.log('   DB_PASSWORD=your_password');


