/**
 * Migration Script: Update Role Permissions
 * 
 * This script updates existing roles with new/improved permissions.
 * Run this after upgrading to add new permissions to existing roles.
 * 
 * Usage:
 *   node scripts/update-role-permissions.js
 */

require('dotenv').config();

console.log('🔐 Role Permissions Update Script');
console.log('==================================\n');

// Initialize database
const db = require('../config/database-loader');

// Define the updated permissions for each role
// Note: Use actual role names from your database (check with: node scripts/check-roles.js)
const rolePermissionUpdates = {
  // "managers" - actual name in database (not "manager")
  managers: [
    // Audit Management
    'manage_audits', 'view_audits', 'create_audits', 'edit_audits',
    // Scheduled Audits
    'manage_scheduled_audits', 'view_scheduled_audits', 'create_scheduled_audits', 'update_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
    // Templates
    'manage_templates', 'display_templates', 'view_templates', 'create_templates', 'edit_templates', 'delete_templates',
    // Locations
    'manage_locations', 'view_locations', 'create_locations', 'edit_locations',
    // Actions & Tasks
    'manage_actions', 'view_actions', 'create_actions', 'update_actions',
    'manage_tasks', 'view_tasks', 'create_tasks', 'update_tasks',
    // Analytics & Reports (NEW)
    'view_analytics', 'view_store_analytics', 'view_location_verification', 'view_monthly_scorecard', 'export_data',
    // View Users (for assignment)
    'view_users'
  ],
  supervisor: [
    // Audits
    'view_audits', 'create_audits',
    // Scheduled Audits
    'view_scheduled_audits', 'create_scheduled_audits', 'update_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
    // Templates (read-only)
    'display_templates', 'view_templates',
    // Locations
    'view_locations',
    // Actions & Tasks
    'view_actions', 'create_actions', 'update_actions',
    'view_tasks', 'create_tasks', 'update_tasks',
    // Analytics (NEW)
    'view_analytics', 'view_store_analytics', 'view_location_verification',
    // View Users (for assignment)
    'view_users'
  ],
  auditor: [
    // Audits
    'create_audits', 'view_own_audits',
    // Scheduled Audits
    'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
    // Templates (read-only)
    'display_templates', 'view_templates',
    // Locations
    'view_locations',
    // Actions & Tasks
    'view_actions', 'create_actions', 'update_actions',
    'view_tasks', 'create_tasks', 'update_tasks'
  ],
  user: [
    // Audits
    'view_own_audits',
    // Scheduled Audits
    'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
    // Templates (read-only)
    'display_templates',
    // Locations
    'view_locations',
    // Actions & Tasks (own only)
    'view_actions', 'create_actions',
    'view_tasks', 'update_tasks'
  ],
  // Additional role: newauditor (limited auditor)
  newauditor: [
    // Audits
    'view_own_audits', 'create_audits',
    // Scheduled Audits
    'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
    // Templates (read-only)
    'display_templates', 'view_templates',
    // Locations
    'view_locations',
    // Actions & Tasks
    'view_actions', 'create_actions',
    'view_tasks'
  ]
};

// Supervisor role definition (for new installations)
const supervisorRole = {
  name: 'supervisor',
  display_name: 'Supervisor',
  description: 'Can view team audits, manage scheduled audits for team, and view reports.',
  is_system_role: 1,
  permissions: JSON.stringify(rolePermissionUpdates.supervisor)
};

const runMigration = async () => {
  // Wait for database to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const dbInstance = db.getDb();
  
  if (!dbInstance) {
    console.error('❌ Database not initialized');
    process.exit(1);
  }

  console.log('Database connection ready...\n');

  // Check if supervisor role exists
  dbInstance.get('SELECT * FROM roles WHERE name = ?', ['supervisor'], (err, role) => {
    if (err) {
      console.error('❌ Error checking supervisor role:', err);
      return;
    }

    if (!role) {
      console.log('➕ Creating new Supervisor role...');
      dbInstance.run(
        'INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES (?, ?, ?, ?, ?)',
        [supervisorRole.name, supervisorRole.display_name, supervisorRole.description, supervisorRole.is_system_role, supervisorRole.permissions],
        function(err) {
          if (err) {
            console.error('❌ Error creating supervisor role:', err);
          } else {
            console.log('✅ Supervisor role created successfully');
          }
        }
      );
    } else {
      console.log('✓ Supervisor role already exists');
    }
  });

  // Update existing roles
  Object.entries(rolePermissionUpdates).forEach(([roleName, permissions]) => {
    console.log(`\nUpdating ${roleName} role...`);
    
    dbInstance.get('SELECT * FROM roles WHERE name = ?', [roleName], (err, role) => {
      if (err) {
        console.error(`❌ Error finding ${roleName} role:`, err);
        return;
      }

      if (!role) {
        console.log(`  ⚠ Role ${roleName} not found, skipping`);
        return;
      }

      // Parse existing permissions
      let existingPermissions = [];
      try {
        existingPermissions = JSON.parse(role.permissions || '[]');
      } catch (e) {
        existingPermissions = [];
      }

      // Merge permissions (keep existing, add new)
      const mergedPermissions = [...new Set([...existingPermissions, ...permissions])];
      const newPermissionsJson = JSON.stringify(mergedPermissions);

      // Check if admin (don't modify)
      if (roleName === 'admin') {
        console.log(`  ✓ Admin role has wildcard (*) - no changes needed`);
        return;
      }

      // Count new permissions
      const newPerms = permissions.filter(p => !existingPermissions.includes(p));
      
      if (newPerms.length === 0) {
        console.log(`  ✓ No new permissions to add`);
        return;
      }

      console.log(`  ➕ Adding ${newPerms.length} new permissions: ${newPerms.join(', ')}`);

      dbInstance.run(
        'UPDATE roles SET permissions = ? WHERE name = ?',
        [newPermissionsJson, roleName],
        function(err) {
          if (err) {
            console.error(`  ❌ Error updating ${roleName}:`, err);
          } else {
            console.log(`  ✅ ${roleName} role updated successfully`);
          }
        }
      );
    });
  });

  // Wait for all operations to complete
  setTimeout(() => {
    console.log('\n==================================');
    console.log('✅ Migration completed!');
    console.log('\nNew permissions added:');
    console.log('  - view_location_verification: Access Location Verification Report');
    console.log('  - view_store_analytics: Access Store Analytics');
    console.log('  - view_monthly_scorecard: Access Monthly Scorecard');
    console.log('  - view_users: View user list (for managers)');
    console.log('\nNew role added:');
    console.log('  - supervisor: Team lead with limited management access');
    process.exit(0);
  }, 3000);
};

// Initialize database and run migration
const startMigration = async () => {
  try {
    // Check if db has init method (MSSQL)
    if (typeof db.init === 'function') {
      console.log('Initializing database connection...');
      await db.init();
      console.log('✅ Database connected\n');
    }
    
    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    runMigration();
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  }
};

startMigration();

