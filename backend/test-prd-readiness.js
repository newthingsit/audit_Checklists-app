/**
 * PRD Readiness Test Suite
 * Tests all critical endpoints and functionality before deployment
 */

const axios = require('axios');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test credentials (adjust as needed)
const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'admin123';

let authToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test helper
async function test(name, testFn) {
  try {
    logInfo(`Testing: ${name}`);
    await testFn();
    logSuccess(`${name} - PASSED`);
    return true;
  } catch (error) {
    logError(`${name} - FAILED`);
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    return false;
  }
}

// Authentication
async function login() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  
  if (response.data.token) {
    authToken = response.data.token;
    return true;
  }
  throw new Error('No token received');
}

// Test endpoints
async function testSettingsPreferences() {
  const response = await axios.get(`${API_BASE_URL}/settings/preferences`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200 && response.data.preferences) {
    return true;
  }
  throw new Error('Invalid response');
}

async function testAuthMe() {
  const response = await axios.get(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200 && response.data.user) {
    return true;
  }
  throw new Error('Invalid response');
}

async function testDashboardAnalytics() {
  const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200 && response.data) {
    // Check for scheduleAdherence
    if (response.data.scheduleAdherence !== undefined) {
      return true;
    }
    throw new Error('scheduleAdherence missing from response');
  }
  throw new Error('Invalid response');
}

async function testStandardDashboardReport() {
  const response = await axios.get(
    `${API_BASE_URL}/reports/dashboard/excel?date_from=2025-11-01&date_to=2025-12-13`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer',
    }
  );
  
  if (response.status === 200 && response.data) {
    // Check if it's an Excel file (starts with PK for ZIP/Excel format)
    const buffer = Buffer.from(response.data);
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return true;
    }
    throw new Error('Response is not a valid Excel file');
  }
  throw new Error('Invalid response');
}

async function testEnhancedDashboardReport() {
  const response = await axios.get(
    `${API_BASE_URL}/reports/dashboard/enhanced?date_from=2025-11-01&date_to=2025-12-13`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer',
    }
  );
  
  if (response.status === 200 && response.data) {
    // Check if it's an Excel file
    const buffer = Buffer.from(response.data);
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return true;
    }
    throw new Error('Response is not a valid Excel file');
  }
  throw new Error('Invalid response');
}

async function testScheduledAudits() {
  const response = await axios.get(`${API_BASE_URL}/scheduled-audits`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200) {
    return true;
  }
  throw new Error('Invalid response');
}

async function testRescheduleCount() {
  // Test with a sample ID (adjust if needed)
  const response = await axios.get(
    `${API_BASE_URL}/scheduled-audits/reschedule-count?scheduled_audit_id=1`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  
  if (response.status === 200 && response.data) {
    // Should have count, limit, and remaining fields
    if (response.data.count !== undefined && response.data.limit !== undefined) {
      return true;
    }
    throw new Error('Missing required fields in response');
  }
  throw new Error('Invalid response');
}

async function testChecklistTemplates() {
  const response = await axios.get(`${API_BASE_URL}/checklists`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200) {
    return true;
  }
  throw new Error('Invalid response');
}

async function testAuditsList() {
  const response = await axios.get(`${API_BASE_URL}/audits`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  if (response.status === 200) {
    return true;
  }
  throw new Error('Invalid response');
}

// Main test runner
async function runTests() {
  log('\n🚀 PRD Readiness Test Suite\n', 'blue');
  log('='.repeat(50), 'blue');
  
  const results = [];
  
  // Authentication
  log('\n📋 Authentication Tests\n', 'yellow');
  results.push(await test('Login', login));
  
  if (!authToken) {
    logError('Cannot proceed without authentication token');
    return;
  }
  
  // Critical Endpoints
  log('\n📋 Critical Endpoint Tests\n', 'yellow');
  results.push(await test('Settings/Preferences Endpoint', testSettingsPreferences));
  results.push(await test('Auth/Me Endpoint', testAuthMe));
  results.push(await test('Dashboard Analytics (with Schedule Adherence)', testDashboardAnalytics));
  
  // Report Endpoints
  log('\n📋 Report Endpoint Tests\n', 'yellow');
  results.push(await test('Standard Dashboard Report (Excel)', testStandardDashboardReport));
  results.push(await test('Enhanced Dashboard Report (Excel)', testEnhancedDashboardReport));
  
  // Feature Endpoints
  log('\n📋 Feature Endpoint Tests\n', 'yellow');
  results.push(await test('Scheduled Audits List', testScheduledAudits));
  results.push(await test('Reschedule Count Endpoint', testRescheduleCount));
  results.push(await test('Checklist Templates', testChecklistTemplates));
  results.push(await test('Audits List', testAuditsList));
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  log(`\n📊 Test Results: ${passed}/${total} passed (${percentage}%)`, 'blue');
  
  if (passed === total) {
    logSuccess('\n🎉 All tests passed! Ready for PRD deployment.\n');
    process.exit(0);
  } else {
    logError(`\n⚠️  ${total - passed} test(s) failed. Please fix issues before deploying.\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError('Test suite failed with error:');
  console.error(error);
  process.exit(1);
});

