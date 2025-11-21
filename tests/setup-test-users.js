/**
 * Setup Test Users Script
 * 
 * This script creates test users for the permissions testing suite.
 * Run with: node tests/setup-test-users.js
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:5000
 * - Admin user exists in database
 */

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test users to create
const TEST_USERS = [
  {
    email: 'admin@test.com',
    password: 'password123',
    name: 'Test Admin',
    role: 'admin'
  },
  {
    email: 'manager@test.com',
    password: 'password123',
    name: 'Test Manager',
    role: 'manager'
  },
  {
    email: 'auditor@test.com',
    password: 'password123',
    name: 'Test Auditor',
    role: 'auditor'
  },
  {
    email: 'user@test.com',
    password: 'password123',
    name: 'Test User',
    role: 'user'
  }
];

async function createTestUsers() {
  console.log('🔧 Setting up test users...\n');
  
  // First, try to login as admin to get token
  let adminToken = null;
  try {
    // Try common admin credentials
    const adminCredentials = [
      { email: 'admin@test.com', password: 'password123' },
      { email: 'admin', password: 'admin' },
      { email: 'admin@example.com', password: 'admin123' }
    ];
    
    for (const creds of adminCredentials) {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, creds);
        adminToken = response.data.token;
        console.log(`✅ Logged in as admin: ${creds.email}`);
        break;
      } catch (err) {
        // Continue to next credential
      }
    }
    
    if (!adminToken) {
      console.log('⚠️  Could not login as admin. Attempting to create users without admin token...');
      console.log('   You may need to manually create these users or login as admin first.\n');
    }
  } catch (error) {
    console.log('⚠️  Could not login as admin. Attempting to create users without admin token...\n');
  }
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const user of TEST_USERS) {
    try {
      // Check if user already exists by trying to login
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        if (loginResponse.data.token) {
          console.log(`⏭️  User ${user.email} already exists, skipping...`);
          skipped++;
          continue;
        }
      } catch (loginErr) {
        // User doesn't exist, continue to create
      }
      
      // Try to create user via API (requires admin token)
      if (adminToken) {
        try {
          const createResponse = await axios.post(
            `${BASE_URL}/api/users`,
            {
              email: user.email,
              password: user.password,
              name: user.name,
              role: user.role
            },
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (createResponse.status === 201) {
            console.log(`✅ Created user: ${user.email} (${user.role})`);
            created++;
          }
        } catch (createErr) {
          if (createErr.response?.status === 409) {
            console.log(`⏭️  User ${user.email} already exists, skipping...`);
            skipped++;
          } else {
            console.log(`❌ Failed to create ${user.email}: ${createErr.response?.data?.error || createErr.message}`);
            failed++;
          }
        }
      } else {
        console.log(`⚠️  Cannot create ${user.email} - no admin token. Please create manually:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Error processing ${user.email}: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${TEST_USERS.length}`);
  
  if (failed > 0 && !adminToken) {
    console.log('\n💡 Tip: To create users automatically, login as admin first.');
    console.log('   Or create users manually through the web interface at /users');
  }
  
  console.log('\n✨ Setup complete!\n');
}

// Run setup
createTestUsers().catch(error => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});

