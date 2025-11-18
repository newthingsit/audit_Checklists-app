/**
 * Fix .env file for SQL Server
 * Updates DB_TYPE from mysql to mssql
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('💡 Please create a .env file with the following content:');
  console.log('');
  console.log('DB_TYPE=mssql');
  console.log('DB_HOST=LOCALHOST\\SQLEXPRESS');
  console.log('DB_NAME=audit_checklists');
  console.log('DB_USER=sa');
  console.log('DB_PASSWORD=your_password');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Replace DB_TYPE=mysql with DB_TYPE=mssql
if (envContent.includes('DB_TYPE=mysql')) {
  envContent = envContent.replace(/DB_TYPE=mysql/gi, 'DB_TYPE=mssql');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated DB_TYPE from mysql to mssql');
} else if (envContent.includes('DB_TYPE=mssql') || envContent.includes('DB_TYPE=sqlserver')) {
  console.log('✅ DB_TYPE is already set to mssql or sqlserver');
} else {
  // Add DB_TYPE=mssql if it doesn't exist
  if (!envContent.includes('DB_TYPE=')) {
    envContent = 'DB_TYPE=mssql\n' + envContent;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Added DB_TYPE=mssql to .env file');
  } else {
    console.log('⚠️  DB_TYPE is set to something other than mysql/mssql');
  }
}

console.log('\n📋 Current .env configuration:');
console.log('='.repeat(60));
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
lines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    if (line.includes('PASSWORD')) {
      console.log(line.replace(/=.*/, '=***'));
    } else {
      console.log(line);
    }
  }
});
console.log('='.repeat(60));

