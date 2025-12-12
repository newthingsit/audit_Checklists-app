/**
 * Script to reset a user's password
 * Usage: node backend/scripts/reset-user-password.js <email> <newPassword>
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database-loader');

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node reset-user-password.js <email> <newPassword>');
  process.exit(1);
}

const dbInstance = db.getDb();
const normalizedEmail = email.toLowerCase().trim();

// Find user
dbInstance.get('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail], async (err, user) => {
  if (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
  
  if (!user) {
    console.error(`User with email ${email} not found`);
    process.exit(1);
  }
  
  console.log(`Found user: ${user.name} (${user.email})`);
  console.log('Resetting password...');
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update password
  dbInstance.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], function(err) {
    if (err) {
      console.error('Error updating password:', err);
      process.exit(1);
    }
    
    console.log('✅ Password reset successfully!');
    console.log(`User: ${user.email}`);
    console.log(`New password: ${newPassword}`);
    process.exit(0);
  });
});

