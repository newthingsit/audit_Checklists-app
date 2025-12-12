/**
 * Test script for new features:
 * 1. Individual checklist rescheduling (2 times per checklist)
 * 2. Backdated and future dates for rescheduling
 * 3. Scheduled audits open only on scheduled date
 * 4. Schedule Adherence in dashboard
 * 5. Checklist assignment user-wise
 * 
 * Usage: node backend/tests/test-new-features.js
 */

const axios = require('axios');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test configuration
let authToken = null;
let testUserId = null;
let testTemplateId = null;
let testLocationId = null;
let testScheduledAuditId = null;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = authToken) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    if (data) {
      config.data = data;
    }
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test 1: Login and get test data
async function setupTest() {
  console.log('\n🔧 Setting up test environment...\n');
  
  // Try to login with test user (adjust credentials as needed)
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin123'
  }, null);
  
  if (!loginResult.success) {
    console.log('⚠️  Could not login with default credentials. Please login manually and set AUTH_TOKEN environment variable.');
    console.log('   Example: AUTH_TOKEN=your_token_here node backend/tests/test-new-features.js\n');
    return false;
  }
  
  authToken = loginResult.data.token;
  testUserId = loginResult.data.user?.id;
  
  logTest('Setup: Login', true, `User ID: ${testUserId}`);
  
  // Get or create template
  const templatesResult = await makeRequest('GET', '/templates');
  if (templatesResult.success && templatesResult.data.templates?.length > 0) {
    testTemplateId = templatesResult.data.templates[0].id;
    logTest('Setup: Get Template', true, `Template ID: ${testTemplateId}`);
  } else {
    logTest('Setup: Get Template', false, 'No templates found');
    return false;
  }
  
  // Get or create location
  const locationsResult = await makeRequest('GET', '/locations');
  if (locationsResult.success && locationsResult.data.locations?.length > 0) {
    testLocationId = locationsResult.data.locations[0].id;
    logTest('Setup: Get Location', true, `Location ID: ${testLocationId}`);
  } else {
    logTest('Setup: Get Location', false, 'No locations found');
    return false;
  }
  
  return true;
}

// Test 2: Individual checklist rescheduling (per-checklist, not per-user)
async function testIndividualChecklistRescheduling() {
  console.log('\n📋 Test 2: Individual Checklist Rescheduling\n');
  
  // Create a scheduled audit
  const today = new Date();
  const scheduledDate = new Date(today);
  scheduledDate.setDate(scheduledDate.getDate() + 1); // Tomorrow
  
  const createScheduleResult = await makeRequest('POST', '/scheduled-audits', {
    template_id: testTemplateId,
    location_id: testLocationId,
    scheduled_date: scheduledDate.toISOString().split('T')[0],
    frequency: 'once'
  });
  
  if (!createScheduleResult.success) {
    logTest('2.1: Create Scheduled Audit', false, createScheduleResult.error?.error || 'Failed');
    return;
  }
  
  testScheduledAuditId = createScheduleResult.data.id;
  logTest('2.1: Create Scheduled Audit', true, `ID: ${testScheduledAuditId}`);
  
  // Check initial reschedule count (should be 0)
  const countResult1 = await makeRequest('GET', `/scheduled-audits/reschedule-count?scheduled_audit_id=${testScheduledAuditId}`);
  const initialCount = countResult1.data?.count || countResult1.data?.rescheduleCount || 0;
  logTest('2.2: Initial Reschedule Count', initialCount === 0, `Count: ${initialCount}`);
  
  // First reschedule
  const newDate1 = new Date(scheduledDate);
  newDate1.setDate(newDate1.getDate() + 2);
  
  const reschedule1Result = await makeRequest('POST', `/scheduled-audits/${testScheduledAuditId}/reschedule`, {
    new_date: newDate1.toISOString().split('T')[0]
  });
  
  logTest('2.3: First Reschedule', reschedule1Result.success, reschedule1Result.error?.error || 'Success');
  
  // Check count after first reschedule (should be 1)
  const countResult2 = await makeRequest('GET', `/scheduled-audits/reschedule-count?scheduled_audit_id=${testScheduledAuditId}`);
  const countAfter1 = countResult2.data?.count || countResult2.data?.rescheduleCount || 0;
  logTest('2.4: Reschedule Count After First', countAfter1 === 1, `Count: ${countAfter1}`);
  
  // Second reschedule
  const newDate2 = new Date(newDate1);
  newDate2.setDate(newDate2.getDate() + 1);
  
  const reschedule2Result = await makeRequest('POST', `/scheduled-audits/${testScheduledAuditId}/reschedule`, {
    new_date: newDate2.toISOString().split('T')[0]
  });
  
  logTest('2.5: Second Reschedule', reschedule2Result.success, reschedule2Result.error?.error || 'Success');
  
  // Check count after second reschedule (should be 2)
  const countResult3 = await makeRequest('GET', `/scheduled-audits/reschedule-count?scheduled_audit_id=${testScheduledAuditId}`);
  const countAfter2 = countResult3.data?.count || countResult3.data?.rescheduleCount || 0;
  logTest('2.6: Reschedule Count After Second', countAfter2 === 2, `Count: ${countAfter2}`);
  
  // Third reschedule should fail (limit reached)
  const newDate3 = new Date(newDate2);
  newDate3.setDate(newDate3.getDate() + 1);
  
  const reschedule3Result = await makeRequest('POST', `/scheduled-audits/${testScheduledAuditId}/reschedule`, {
    new_date: newDate3.toISOString().split('T')[0]
  });
  
  logTest('2.7: Third Reschedule (Should Fail)', !reschedule3Result.success && reschedule3Result.status === 400, 
    reschedule3Result.error?.error || 'Should have failed');
}

// Test 3: Backdated and future dates for rescheduling
async function testBackdatedRescheduling() {
  console.log('\n📅 Test 3: Backdated and Future Dates for Rescheduling\n');
  
  // Create a new scheduled audit for this test
  const today = new Date();
  const scheduledDate = new Date(today);
  scheduledDate.setDate(scheduledDate.getDate() + 5);
  
  const createScheduleResult = await makeRequest('POST', '/scheduled-audits', {
    template_id: testTemplateId,
    location_id: testLocationId,
    scheduled_date: scheduledDate.toISOString().split('T')[0],
    frequency: 'once'
  });
  
  if (!createScheduleResult.success) {
    logTest('3.1: Create Scheduled Audit for Backdate Test', false, createScheduleResult.error?.error || 'Failed');
    return;
  }
  
  const scheduleId = createScheduleResult.data.id;
  logTest('3.1: Create Scheduled Audit for Backdate Test', true, `ID: ${scheduleId}`);
  
  // Try rescheduling to a past date (should work now)
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 5);
  
  const backdateResult = await makeRequest('POST', `/scheduled-audits/${scheduleId}/reschedule`, {
    new_date: pastDate.toISOString().split('T')[0]
  });
  
  logTest('3.2: Reschedule to Past Date', backdateResult.success, 
    backdateResult.error?.error || 'Success - backdated rescheduling allowed');
  
  // Try rescheduling to a future date (should also work)
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);
  
  const futuredateResult = await makeRequest('POST', `/scheduled-audits/${scheduleId}/reschedule`, {
    new_date: futureDate.toISOString().split('T')[0]
  });
  
  logTest('3.3: Reschedule to Future Date', futuredateResult.success, 
    futuredateResult.error?.error || 'Success - future rescheduling allowed');
}

// Test 4: Scheduled audits open only on scheduled date
async function testSameDayValidation() {
  console.log('\n📆 Test 4: Scheduled Audits Open Only on Scheduled Date\n');
  
  // Create a scheduled audit for tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const createScheduleResult = await makeRequest('POST', '/scheduled-audits', {
    template_id: testTemplateId,
    location_id: testLocationId,
    scheduled_date: tomorrow.toISOString().split('T')[0],
    frequency: 'once'
  });
  
  if (!createScheduleResult.success) {
    logTest('4.1: Create Scheduled Audit for Tomorrow', false, createScheduleResult.error?.error || 'Failed');
    return;
  }
  
  const scheduleId = createScheduleResult.data.id;
  logTest('4.1: Create Scheduled Audit for Tomorrow', true, `ID: ${scheduleId}`);
  
  // Try to start audit today (should fail - not the scheduled date)
  const startTodayResult = await makeRequest('POST', '/audits', {
    template_id: testTemplateId,
    restaurant_name: 'Test Restaurant',
    scheduled_audit_id: scheduleId
  });
  
  logTest('4.2: Start Audit Before Scheduled Date', !startTodayResult.success && startTodayResult.status === 400,
    startTodayResult.error?.error || startTodayResult.error?.message || 'Should have failed');
  
  // Reschedule to today
  const rescheduleResult = await makeRequest('POST', `/scheduled-audits/${scheduleId}/reschedule`, {
    new_date: today.toISOString().split('T')[0]
  });
  
  if (rescheduleResult.success) {
    // Now try to start audit (should succeed - it's the scheduled date)
    const startTodayAfterRescheduleResult = await makeRequest('POST', '/audits', {
      template_id: testTemplateId,
      restaurant_name: 'Test Restaurant',
      scheduled_audit_id: scheduleId
    });
    
    logTest('4.3: Start Audit on Scheduled Date', startTodayAfterRescheduleResult.success,
      startTodayAfterRescheduleResult.error?.error || 'Success');
  } else {
    logTest('4.3: Reschedule to Today', false, rescheduleResult.error?.error || 'Failed to reschedule');
  }
}

// Test 5: Schedule Adherence in dashboard
async function testScheduleAdherence() {
  console.log('\n📊 Test 5: Schedule Adherence in Dashboard\n');
  
  const dashboardResult = await makeRequest('GET', '/analytics/dashboard');
  
  if (!dashboardResult.success) {
    logTest('5.1: Get Dashboard Analytics', false, dashboardResult.error?.error || 'Failed');
    return;
  }
  
  logTest('5.1: Get Dashboard Analytics', true, 'Success');
  
  const scheduleAdherence = dashboardResult.data.scheduleAdherence;
  
  if (scheduleAdherence) {
    logTest('5.2: Schedule Adherence Exists', true, 
      `Total: ${scheduleAdherence.total}, On Time: ${scheduleAdherence.onTime}, Adherence: ${scheduleAdherence.adherence}%`);
    
    logTest('5.3: Schedule Adherence Structure', 
      typeof scheduleAdherence.total === 'number' && 
      typeof scheduleAdherence.onTime === 'number' && 
      typeof scheduleAdherence.adherence === 'number',
      'All fields are numbers');
  } else {
    logTest('5.2: Schedule Adherence Exists', false, 'scheduleAdherence not found in response');
  }
}

// Test 6: Checklist assignment user-wise
async function testChecklistAssignment() {
  console.log('\n👤 Test 6: Checklist Assignment User-Wise\n');
  
  // Get checklist permissions for current user
  const permissionsResult = await makeRequest('GET', `/checklists/${testTemplateId}/permissions/user/${testUserId}`);
  
  logTest('6.1: Get Checklist Permissions', permissionsResult.success || permissionsResult.status === 404,
    permissionsResult.error?.error || 'Success (or no permissions set yet)');
  
  // Assign checklist to user
  const assignResult = await makeRequest('POST', `/checklists/${testTemplateId}/permissions/user/${testUserId}`, {
    can_start_audit: true
  });
  
  logTest('6.2: Assign Checklist to User', assignResult.success, assignResult.error?.error || 'Success');
  
  // Verify assignment
  const verifyResult = await makeRequest('GET', `/checklists/${testTemplateId}/permissions/user/${testUserId}`);
  
  if (verifyResult.success) {
    logTest('6.3: Verify Checklist Assignment', verifyResult.data.can_start_audit !== 0,
      `can_start_audit: ${verifyResult.data.can_start_audit}`);
  } else {
    logTest('6.3: Verify Checklist Assignment', false, verifyResult.error?.error || 'Failed');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Testing New Features\n');
  console.log('='.repeat(60));
  
  const setupSuccess = await setupTest();
  if (!setupSuccess) {
    console.log('\n❌ Setup failed. Please check your credentials and try again.');
    return;
  }
  
  await testIndividualChecklistRescheduling();
  await testBackdatedRescheduling();
  await testSameDayValidation();
  await testScheduleAdherence();
  await testChecklistAssignment();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
  console.log(`\nSuccess Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
    });
  }
  
  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});

