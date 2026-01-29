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

const roleDefinitions = [
  {
    name: 'manager',
    display_name: 'Manager',
    description: 'Manager role for automated tests',
    is_system_role: 0,
    permissions: [
      'manage_audits', 'view_audits', 'create_audits', 'edit_audits',
      'manage_scheduled_audits', 'view_scheduled_audits', 'create_scheduled_audits', 'update_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
      'manage_templates', 'display_templates', 'view_templates', 'create_templates', 'edit_templates', 'delete_templates',
      'manage_locations', 'view_locations', 'create_locations', 'edit_locations',
      'manage_actions', 'view_actions', 'create_actions', 'update_actions',
      'manage_tasks', 'view_tasks', 'create_tasks', 'update_tasks',
      'view_analytics', 'view_store_analytics', 'view_location_verification', 'view_monthly_scorecard', 'export_data'
    ]
  },
  {
    name: 'auditor',
    display_name: 'Auditor',
    description: 'Auditor role for automated tests',
    is_system_role: 0,
    permissions: [
      'create_audits', 'view_own_audits',
      'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
      'display_templates', 'view_templates',
      'view_locations',
      'view_actions', 'create_actions', 'update_actions',
      'view_tasks', 'create_tasks', 'update_tasks'
    ]
  },
  {
    name: 'user',
    display_name: 'User',
    description: 'Basic user role for automated tests',
    is_system_role: 0,
    permissions: [
      'view_own_audits',
      'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
      'display_templates',
      'view_locations',
      'view_actions', 'create_actions',
      'view_tasks', 'update_tasks'
    ]
  }
];

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
  },
  {
    name: 'Permissions Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Permissions Manager',
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager'
  },
  {
    name: 'Permissions Auditor',
    email: 'auditor@test.com',
    password: 'password123',
    role: 'auditor'
  },
  {
    name: 'Permissions User',
    email: 'user@test.com',
    password: 'password123',
    role: 'user'
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
    
    console.log('Ensuring test roles...\n');

    for (const role of roleDefinitions) {
      const permissionsJson = JSON.stringify(role.permissions || []);
      const existingRole = await new Promise((resolve, reject) => {
        dbInstance.get('SELECT id FROM roles WHERE name = ?', [role.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingRole) {
        await new Promise((resolve, reject) => {
          dbInstance.run(
            'UPDATE roles SET permissions = ?, display_name = ?, description = ? WHERE name = ?',
            [permissionsJson, role.display_name, role.description, role.name],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        console.log(`  ✓ Updated role: ${role.name}`);
      } else {
        await new Promise((resolve, reject) => {
          dbInstance.run(
            'INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES (?, ?, ?, ?, ?)',
            [role.name, role.display_name, role.description, role.is_system_role ? 1 : 0, permissionsJson],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log(`  ✓ Created role: ${role.name}`);
      }
    }

    console.log('\nCreating test users...\n');
    
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
        // Update password to ensure it matches test credentials
        await new Promise((resolve, reject) => {
          dbInstance.run(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, user.email],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        console.log(`  ✓ ${user.email} already exists (password updated)`);
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

