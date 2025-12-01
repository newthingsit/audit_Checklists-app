/**
 * Setup Test Data Script
 * 
 * Creates test users for automated testing
 * Run with: node tests/setup-test-data.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database-loader');

console.log('🔧 Setting Up Test Data...\n');

const testUsers = [
  {
    name: 'Test Admin',
    email: 'testadmin@test.com',
    password: 'Test123!',
    role: 'admin'
  },
  {
    name: 'Test Manager',
    email: 'testmanager@test.com',
    password: 'Test123!',
    role: 'managers'
  },
  {
    name: 'Test Auditor',
    email: 'testauditor@test.com',
    password: 'Test123!',
    role: 'auditor'
  }
];

async function setupTestData() {
  try {
    if (typeof db.init === 'function') {
      await db.init();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const dbInstance = db.getDb();
    
    if (!dbInstance) {
      throw new Error('Database not initialized');
    }
    
    console.log('Creating test users...\n');
    
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Check if user exists
      const existing = await new Promise((resolve, reject) => {
        dbInstance.get('SELECT id FROM users WHERE email = ?', [user.email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (existing) {
        console.log(`  ✓ ${user.email} already exists`);
      } else {
        await new Promise((resolve, reject) => {
          dbInstance.run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [user.name, user.email, hashedPassword, user.role],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log(`  ✓ Created ${user.email} with role: ${user.role}`);
      }
    }
    
    console.log('\n✅ Test data setup complete!');
    console.log('\nTest Credentials:');
    console.log('─────────────────────────────────────');
    testUsers.forEach(u => {
      console.log(`  ${u.role.padEnd(10)} | ${u.email} | ${u.password}`);
    });
    console.log('─────────────────────────────────────');
    
    // Also list existing admin users
    console.log('\nExisting Admin Users:');
    const admins = await new Promise((resolve, reject) => {
      dbInstance.all("SELECT email, role FROM users WHERE role = 'admin' OR role = 'Admin'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    if (admins.length > 0) {
      admins.forEach(a => console.log(`  - ${a.email} (${a.role})`));
    } else {
      console.log('  (none found)');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setupTestData();

