const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/audit.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Check if user exists
db.get('SELECT * FROM users WHERE email = ?', ['admin@test.com'], async (err, user) => {
  if (err) {
    console.error('Error checking user:', err);
    db.close();
    process.exit(1);
  }

  if (user) {
    console.log('Default user already exists!');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    db.close();
    process.exit(0);
  }

  // Create default user
  const defaultEmail = 'admin@test.com';
  const defaultPassword = 'admin123';
  const defaultName = 'Admin User';

  try {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [defaultEmail, hashedPassword, defaultName, 'admin'],
      function(err) {
        if (err) {
          console.error('Error creating user:', err);
          db.close();
          process.exit(1);
        } else {
          console.log('Default user created successfully!');
          console.log('Email:', defaultEmail);
          console.log('Password:', defaultPassword);
          db.close();
          process.exit(0);
        }
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    db.close();
    process.exit(1);
  }
});

