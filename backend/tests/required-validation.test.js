/**
 * Required validation tests for batch + single-item audit updates
 *
 * Usage: node backend/tests/required-validation.test.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || null;

const adminCredentials = [
  { email: 'admin@lbf.co.in', password: 'Admin123@' },
  { email: 'testadmin@test.com', password: 'Test123!' },
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@admin.com', password: 'admin123' }
];

let authToken = AUTH_TOKEN;
let testTemplateId = null;
let testItemId = null;
let testLocation = null;
let testAuditId = null;
let testAuditIdSingle = null;

const results = { passed: 0, failed: 0 };

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
  if (passed) results.passed += 1;
  else results.failed += 1;
}

function isAdminLoginResponse(data) {
  const role = String(data?.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;
  const permissions = data?.user?.permissions || [];
  return Array.isArray(permissions) && permissions.includes('*');
}

async function login() {
  if (authToken) return true;
  for (const creds of adminCredentials) {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, creds);
      if (res.data?.token && isAdminLoginResponse(res.data)) {
        authToken = res.data.token;
        logTest('Login', true, creds.email);
        return true;
      }
    } catch (e) {
      // try next credential
    }
  }
  logTest('Login', false, 'No admin credentials worked');
  return false;
}

async function fetchLocation() {
  const res = await axios.get(`${API_BASE_URL}/locations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const locations = res.data?.locations || [];
  if (!locations.length) {
    logTest('Fetch location', false, 'No locations found');
    return false;
  }
  testLocation = locations[0];
  logTest('Fetch location', true, `Location ID: ${testLocation.id}`);
  return true;
}

async function createTemplate() {
  const payload = {
    name: `Required Validation ${Date.now()}`,
    category: 'Required Validation',
    description: 'Test template for required validation',
    items: [
      {
        title: 'Required Open Ended',
        description: 'Must be answered',
        category: 'Required Validation',
        required: true,
        input_type: 'open_ended',
        options: []
      }
    ]
  };

  const res = await axios.post(`${API_BASE_URL}/checklists`, payload, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  testTemplateId = res.data?.id;
  if (!testTemplateId) {
    logTest('Create template', false, 'No template id returned');
    return false;
  }
  logTest('Create template', true, `Template ID: ${testTemplateId}`);
  return true;
}

async function fetchTemplateItem() {
  const res = await axios.get(`${API_BASE_URL}/checklists/${testTemplateId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const items = res.data?.items || [];
  if (!items.length) {
    logTest('Fetch template items', false, 'No items found');
    return false;
  }
  testItemId = items[0].id;
  logTest('Fetch template items', true, `Item ID: ${testItemId}`);
  return true;
}

async function createAudit() {
  const payload = {
    template_id: testTemplateId,
    restaurant_name: testLocation.name,
    location: testLocation.name,
    location_id: testLocation.id,
    notes: ''
  };
  const res = await axios.post(`${API_BASE_URL}/audits`, payload, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  testAuditId = res.data?.id;
  if (!testAuditId) {
    logTest('Create audit', false, 'No audit id returned');
    return false;
  }
  logTest('Create audit', true, `Audit ID: ${testAuditId}`);
  return true;
}

async function createAuditForSingle() {
  const payload = {
    template_id: testTemplateId,
    restaurant_name: testLocation.name,
    location: testLocation.name,
    location_id: testLocation.id,
    notes: ''
  };
  const res = await axios.post(`${API_BASE_URL}/audits`, payload, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  testAuditIdSingle = res.data?.id;
  if (!testAuditIdSingle) {
    logTest('Create audit (single-item)', false, 'No audit id returned');
    return false;
  }
  logTest('Create audit (single-item)', true, `Audit ID: ${testAuditIdSingle}`);
  return true;
}

async function testBatchRequiredValidation() {
  try {
    await axios.put(
      `${API_BASE_URL}/audits/${testAuditId}/items/batch`,
      { items: [{ itemId: testItemId, status: 'completed' }] },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Batch required validation (should fail)', false, 'Expected 400 but got success');
  } catch (error) {
    const status = error.response?.status;
    logTest('Batch required validation (should fail)', status === 400, `Status: ${status}`);
  }

  try {
    const res = await axios.put(
      `${API_BASE_URL}/audits/${testAuditId}/items/batch`,
      { items: [{ itemId: testItemId, status: 'completed', comment: 'Answered' }] },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Batch required validation (should pass)', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('Batch required validation (should pass)', false, error.response?.data?.error || error.message);
  }
}

async function testSingleItemRequiredValidation() {
  try {
    await axios.put(
      `${API_BASE_URL}/audits/${testAuditIdSingle}/items/${testItemId}`,
      { status: 'completed' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Single-item required validation (should fail)', false, 'Expected 400 but got success');
  } catch (error) {
    const status = error.response?.status;
    logTest('Single-item required validation (should fail)', status === 400, `Status: ${status}`);
  }

  try {
    const res = await axios.put(
      `${API_BASE_URL}/audits/${testAuditIdSingle}/items/${testItemId}`,
      { status: 'completed', comment: 'Answered' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logTest('Single-item required validation (should pass)', res.status === 200, `Status: ${res.status}`);
  } catch (error) {
    logTest('Single-item required validation (should pass)', false, error.response?.data?.error || error.message);
  }
}

async function main() {
  const okLogin = await login();
  if (!okLogin) process.exit(1);

  const okLocation = await fetchLocation();
  if (!okLocation) process.exit(1);

  const okTemplate = await createTemplate();
  if (!okTemplate) process.exit(1);

  const okItem = await fetchTemplateItem();
  if (!okItem) process.exit(1);

  const okAudit = await createAudit();
  if (!okAudit) process.exit(1);

  const okAuditSingle = await createAuditForSingle();
  if (!okAuditSingle) process.exit(1);

  await testBatchRequiredValidation();
  await testSingleItemRequiredValidation();

  console.log(`\nRequired Validation Tests: ${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test run failed:', error.message);
  process.exit(1);
});
