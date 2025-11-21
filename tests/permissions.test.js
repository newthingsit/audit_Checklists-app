/**
 * Comprehensive Permissions Testing Script
 * 
 * This script tests all permission scenarios for the audit checklist application.
 * Run with: node tests/permissions.test.js
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:5000
 * - Test users created in database
 * - Test data (templates, scheduled audits, etc.) available
 */

// Check if axios is available
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ axios is not installed. Please install it first:');
  console.error('   cd backend && npm install axios');
  process.exit(1);
}

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test users configuration
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    token: null
  },
  manager: {
    email: 'manager@test.com',
    password: 'password123',
    role: 'manager',
    token: null
  },
  auditor: {
    email: 'auditor@test.com',
    password: 'password123',
    role: 'auditor',
    token: null
  },
  user: {
    email: 'user@test.com',
    password: 'password123',
    role: 'user',
    token: null
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to login
async function login(user) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password
    });
    user.token = response.data.token;
    user.permissions = response.data.user?.permissions || [];
    return true;
  } catch (error) {
    console.error(`Login failed for ${user.email}:`, error.response?.data || error.message);
    return false;
  }
}

// Helper function to make authenticated request
async function makeRequest(method, endpoint, user, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      }
    };
    if (data) {
      config.data = data;
    }
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { error: error.message }
    };
  }
}

// Test function
function test(name, condition, expected) {
  if (condition === expected) {
    results.passed++;
    console.log(`✅ ${name}`);
    return true;
  } else {
    results.failed++;
    const error = `❌ ${name} - Expected: ${expected}, Got: ${condition}`;
    results.errors.push(error);
    console.log(error);
    return false;
  }
}

// Test suite
async function runTests() {
  console.log('🚀 Starting Permissions Testing Suite\n');
  console.log('='.repeat(60));

  // Login all users
  console.log('\n📝 Logging in test users...');
  for (const [key, user] of Object.entries(TEST_USERS)) {
    const loggedIn = await login(user);
    test(`Login ${key}`, loggedIn, true);
  }

  // Test 1: Checklist/Template Permissions
  console.log('\n📋 Test Suite 1: Checklist/Template Permissions');
  console.log('-'.repeat(60));

  // Test 1.1: Display Templates
  console.log('\nTest 1.1: Display Templates Permission');
  const auditorTemplates = await makeRequest('GET', '/api/checklists', TEST_USERS.auditor);
  test('Auditor can view templates', auditorTemplates.success, true);
  test('Auditor GET /api/checklists returns 200', auditorTemplates.status, 200);

  const userTemplates = await makeRequest('GET', '/api/checklists', TEST_USERS.user);
  // User might not have display_templates, so this could be 403
  console.log(`User templates access: ${userTemplates.status}`);

  // Test 1.2: Edit Templates
  console.log('\nTest 1.2: Edit Templates Permission');
  const auditorCreate = await makeRequest('POST', '/api/checklists', TEST_USERS.auditor, {
    name: 'Test Template',
    items: []
  });
  test('Auditor cannot create templates', auditorCreate.success, false);
  test('Auditor POST /api/checklists returns 403', auditorCreate.status, 403);

  const managerCreate = await makeRequest('POST', '/api/checklists', TEST_USERS.manager, {
    name: 'Test Template',
    items: []
  });
  test('Manager can create templates', managerCreate.success, true);
  test('Manager POST /api/checklists returns 201', managerCreate.status, 201);

  // Clean up - delete test template
  if (managerCreate.success && managerCreate.data.id) {
    await makeRequest('DELETE', `/api/checklists/${managerCreate.data.id}`, TEST_USERS.manager);
  }

  // Test 1.3: Delete Templates
  console.log('\nTest 1.3: Delete Templates Permission');
  // First create a template to delete
  const createForDelete = await makeRequest('POST', '/api/checklists', TEST_USERS.manager, {
    name: 'Template to Delete',
    items: []
  });
  
  if (createForDelete.success && createForDelete.data.id) {
    const templateId = createForDelete.data.id;
    
    const auditorDelete = await makeRequest('DELETE', `/api/checklists/${templateId}`, TEST_USERS.auditor);
    test('Auditor cannot delete templates', auditorDelete.success, false);
    test('Auditor DELETE returns 403', auditorDelete.status, 403);

    const managerDelete = await makeRequest('DELETE', `/api/checklists/${templateId}`, TEST_USERS.manager);
    test('Manager can delete templates', managerDelete.success, true);
    test('Manager DELETE returns 200', managerDelete.status, 200);
  }

  // Test 2: Scheduled Audit Permissions
  console.log('\n📅 Test Suite 2: Scheduled Audit Permissions');
  console.log('-'.repeat(60));

  // Test 2.1: View Scheduled Audits
  console.log('\nTest 2.1: View Scheduled Audits');
  const auditorScheduled = await makeRequest('GET', '/api/scheduled-audits', TEST_USERS.auditor);
  test('Auditor can view scheduled audits', auditorScheduled.success, true);
  test('Auditor GET /api/scheduled-audits returns 200', auditorScheduled.status, 200);

  // Test 2.2: Start Scheduled Audit
  console.log('\nTest 2.2: Start Scheduled Audit Permission');
  // First, get a scheduled audit ID (if any exist)
  const scheduledList = await makeRequest('GET', '/api/scheduled-audits', TEST_USERS.manager);
  let scheduledAuditId = null;
  let templateId = null;
  
  if (scheduledList.success && scheduledList.data.schedules && scheduledList.data.schedules.length > 0) {
    scheduledAuditId = scheduledList.data.schedules[0].id;
    templateId = scheduledList.data.schedules[0].template_id;
  } else {
    // Create a scheduled audit for testing
    const templates = await makeRequest('GET', '/api/templates', TEST_USERS.manager);
    if (templates.success && templates.data.templates && templates.data.templates.length > 0) {
      templateId = templates.data.templates[0].id;
      const createScheduled = await makeRequest('POST', '/api/scheduled-audits', TEST_USERS.manager, {
        template_id: templateId,
        scheduled_date: new Date().toISOString().split('T')[0],
        frequency: 'once'
      });
      if (createScheduled.success && createScheduled.data.id) {
        scheduledAuditId = createScheduled.data.id;
      }
    }
  }

  if (scheduledAuditId && templateId) {
    // Test user without start_scheduled_audits permission
    const userStartAudit = await makeRequest('POST', '/api/audits', TEST_USERS.user, {
      template_id: templateId,
      restaurant_name: 'Test Restaurant',
      scheduled_audit_id: scheduledAuditId
    });
    test('User cannot start scheduled audit', userStartAudit.success, false);
    test('User POST with scheduled_audit_id returns 403', userStartAudit.status, 403);

    // Test auditor with start_scheduled_audits permission
    const auditorStartAudit = await makeRequest('POST', '/api/audits', TEST_USERS.auditor, {
      template_id: templateId,
      restaurant_name: 'Test Restaurant',
      scheduled_audit_id: scheduledAuditId
    });
    // This might fail if auditor is not assigned to the scheduled audit
    console.log(`Auditor start audit: ${auditorStartAudit.status} - ${auditorStartAudit.data.error || 'OK'}`);
  }

  // Test 3: Audit Permissions
  console.log('\n📊 Test Suite 3: Audit Permissions');
  console.log('-'.repeat(60));

  // Test 3.1: View Own Audits
  console.log('\nTest 3.1: View Own Audits');
  const userAudits = await makeRequest('GET', '/api/audits', TEST_USERS.user);
  test('User can view own audits', userAudits.success, true);
  test('User GET /api/audits returns 200', userAudits.status, 200);

  // Test 3.2: Create Regular Audit (without scheduled_audit_id)
  console.log('\nTest 3.2: Create Regular Audit');
  if (templateId) {
    const userCreateAudit = await makeRequest('POST', '/api/audits', TEST_USERS.user, {
      template_id: templateId,
      restaurant_name: 'Test Restaurant'
    });
    test('User can create regular audit', userCreateAudit.success, true);
    test('User POST /api/audits returns 201', userCreateAudit.status, 201);
  }

  // Test 4: Action Plans Permissions
  console.log('\n📝 Test Suite 4: Action Plans Permissions');
  console.log('-'.repeat(60));

  // Test 4.1: View Actions
  console.log('\nTest 4.1: View Actions');
  const userActions = await makeRequest('GET', '/api/actions', TEST_USERS.user);
  test('User can view actions', userActions.success, true);
  test('User GET /api/actions returns 200', userActions.status, 200);

  // Test 4.2: Create Actions
  console.log('\nTest 4.2: Create Actions');
  const userCreateAction = await makeRequest('POST', '/api/actions', TEST_USERS.user, {
    title: 'Test Action',
    description: 'Test action description',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0]
  });
  test('User can create actions', userCreateAction.success, true);
  test('User POST /api/actions returns 201', userCreateAction.status, 201);

  // Test 5: Locations Permissions
  console.log('\n🏪 Test Suite 5: Locations Permissions');
  console.log('-'.repeat(60));

  // Test 5.1: View Locations
  console.log('\nTest 5.1: View Locations');
  const managerLocations = await makeRequest('GET', '/api/locations', TEST_USERS.manager);
  test('Manager can view locations', managerLocations.success, true);
  test('Manager GET /api/locations returns 200', managerLocations.status, 200);

  // Test 5.2: Create Locations
  console.log('\nTest 5.2: Create Locations');
  const managerCreateLocation = await makeRequest('POST', '/api/locations', TEST_USERS.manager, {
    name: 'Test Store',
    store_number: 'TEST001',
    address: '123 Test St'
  });
  test('Manager can create locations', managerCreateLocation.success, true);
  test('Manager POST /api/locations returns 201', managerCreateLocation.status, 201);

  // Test 6: Admin Permissions
  console.log('\n👑 Test Suite 6: Admin Permissions');
  console.log('-'.repeat(60));

  // Test 6.1: View Users
  console.log('\nTest 6.1: View Users (Admin Only)');
  const adminUsers = await makeRequest('GET', '/api/users', TEST_USERS.admin);
  test('Admin can view users', adminUsers.success, true);
  test('Admin GET /api/users returns 200', adminUsers.status, 200);

  const managerUsers = await makeRequest('GET', '/api/users', TEST_USERS.manager);
  test('Manager cannot view users', managerUsers.success, false);
  test('Manager GET /api/users returns 403', managerUsers.status, 403);

  // Test 6.2: View Roles
  console.log('\nTest 6.2: View Roles (Admin Only)');
  const adminRoles = await makeRequest('GET', '/api/roles', TEST_USERS.admin);
  test('Admin can view roles', adminRoles.success, true);
  test('Admin GET /api/roles returns 200', adminRoles.status, 200);

  const managerRoles = await makeRequest('GET', '/api/roles', TEST_USERS.manager);
  test('Manager cannot view roles', managerRoles.success, false);
  test('Manager GET /api/roles returns 403', managerRoles.status, 403);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.passed + results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n✨ Testing complete!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

