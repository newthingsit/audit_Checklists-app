const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../data/audit.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Check all users
db.all('SELECT id, email, name, role FROM users', (err, users) => {
  if (err) {
    console.error('Error fetching users:', err);
    db.close();
    process.exit(1);
  }

  console.log('\n=== All Users in Database ===');
  if (users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`);
    });
  }

  // Test password for admin@example.com
  const testEmail = 'admin@example.com';
  const testPassword = 'admin123';

  db.get('SELECT * FROM users WHERE email = ?', [testEmail], async (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      db.close();
      process.exit(1);
    }

    if (!user) {
      console.log(`\n❌ User ${testEmail} not found in database.`);
      db.close();
      process.exit(0);
    }

    console.log(`\n=== Testing Login for ${testEmail} ===`);
    console.log('User found in database');
    console.log('Testing password...');

    try {
      const isValid = await bcrypt.compare(testPassword, user.password);
      if (isValid) {
        console.log('✅ Password is correct!');
        console.log('Login should work with:');
        console.log(`  Email: ${testEmail}`);
        console.log(`  Password: ${testPassword}`);
      } else {
        console.log('❌ Password is incorrect!');
        console.log('The password hash in database does not match "admin123"');
      }
    } catch (error) {
      console.error('Error comparing password:', error);
    }

    db.close();
    process.exit(0);
  });
});

