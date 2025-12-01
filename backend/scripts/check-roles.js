/**
 * Check existing roles and their permissions in database
 */
require('dotenv').config();
const db = require('../config/database-loader');

console.log('📋 Checking Existing Roles & Permissions...\n');

const checkRoles = async () => {
  try {
    if (typeof db.init === 'function') {
      await db.init();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const dbInstance = db.getDb();
    
    dbInstance.all('SELECT * FROM roles ORDER BY id', [], (err, rows) => {
      if (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      
      console.log('Roles in database:');
      console.log('==================\n');
      
      rows.forEach(role => {
        console.log(`[${role.id}] ${role.name}`);
        console.log(`    Display Name: ${role.display_name}`);
        console.log(`    Type: ${role.is_system_role ? 'System Role' : 'Custom Role'}`);
        console.log(`    Description: ${role.description || 'N/A'}`);
        
        let permissions = [];
        try {
          permissions = JSON.parse(role.permissions || '[]');
        } catch (e) {
          permissions = [];
        }
        
        console.log(`    Permissions (${permissions.length}):`);
        if (permissions.length === 0) {
          console.log('        (none)');
        } else if (permissions.includes('*')) {
          console.log('        * (All Permissions - Admin)');
        } else {
          permissions.forEach(p => console.log(`        - ${p}`));
        }
        console.log('');
      });
      
      console.log(`Total: ${rows.length} roles\n`);
      process.exit(0);
    });
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
};

checkRoles();
