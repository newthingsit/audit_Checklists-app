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

async function createAdminUser() {
  const email = 'admin@example.com';
  const password = 'admin123';
  const name = 'Admin User';

  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Error checking user:', err);
        db.close();
        process.exit(1);
      }

      if (row) {
        console.log('User already exists with email:', email);
        console.log('To reset password, delete the user first or update it manually.');
        db.close();
        process.exit(0);
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, 'admin'],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            db.close();
            process.exit(1);
          }
          console.log('✅ Admin user created successfully!');
          console.log('Email:', email);
          console.log('Password:', password);
          db.close();
          process.exit(0);
        }
      );
    });
  } catch (error) {
    console.error('Error:', error);
    db.close();
    process.exit(1);
  }
}

createAdminUser();

