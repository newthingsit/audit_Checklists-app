const bcrypt = require('bcryptjs');
const db = require('../config/database-loader');

async function createDefaultUser() {
  try {
    // Initialize database connection
    await db.init();
    console.log('Database initialized');

    const dbInstance = db.getDb();
    const defaultEmail = 'admin@test.com';
    const defaultPassword = 'admin123';
    const defaultName = 'Admin User';

    // Check if user exists
    dbInstance.get('SELECT * FROM users WHERE email = ?', [defaultEmail], async (err, user) => {
      if (err) {
        console.error('Error checking user:', err);
        process.exit(1);
      }

      if (user) {
        console.log('✅ Default user already exists!');
        console.log('Email:', defaultEmail);
        console.log('Password:', defaultPassword);
        process.exit(0);
      }

      // Create default user
      try {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        dbInstance.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [defaultEmail, hashedPassword, defaultName, 'admin'],
          function(err) {
            if (err) {
              console.error('Error creating user:', err);
              process.exit(1);
            } else {
              console.log('✅ Default user created successfully!');
              console.log('Email:', defaultEmail);
              console.log('Password:', defaultPassword);
              process.exit(0);
            }
          }
        );
      } catch (error) {
        console.error('Error hashing password:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

createDefaultUser();

