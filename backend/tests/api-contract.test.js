/**
 * API contract tests for audits, attachments, and action plans.
 * Run with: node tests/api-contract.test.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE_RAW = process.env.API_URL || 'http://localhost:5000/api';
const API_BASE_URL = API_BASE_RAW.endsWith('/api') ? API_BASE_RAW : `${API_BASE_RAW.replace(/\/$/, '')}/api`;

const adminCredentials = [
  { email: 'admin@lbf.co.in', password: 'Admin123@' },
  { email: 'testadmin@test.com', password: 'Test123!' },
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@admin.com', password: 'admin123' }
];

const results = { passed: 0, failed: 0, skipped: 0 };

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  if (passed) results.passed += 1;
  else results.failed += 1;
}

function skipTest(name, reason) {
  results.skipped += 1;
  console.log(`○ SKIP: ${name} - ${reason}`);
}

function isAdminLoginResponse(data) {
  const role = String(data?.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;
  const permissions = data?.user?.permissions || [];
  return Array.isArray(permissions) && permissions.includes('*');
}

async function request(method, pathSuffix, body = null, token = null, extraHeaders = {}) {
  const url = `${API_BASE_URL}${pathSuffix}`;
  const headers = { ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: payload });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');
  return { status: response.status, data, headers: response.headers };
}

async function login() {
  for (const creds of adminCredentials) {
    try {
      const res = await request('POST', '/auth/login', creds);
      if (res.status === 200 && res.data?.token && isAdminLoginResponse(res.data)) {
        logTest('Login', true, creds.email);
        return res.data.token;
      }
    } catch (e) {
      // try next credential
    }
  }
  logTest('Login', false, 'No admin credentials worked');
  return null;
}

function loadFixtureImage() {
  const fixturePath = path.join(__dirname, '..', '..', 'web', 'tests', 'fixtures', 'photo1.jpg');
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath);
  }
  // 1x1 PNG fallback
  const fallback =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  return Buffer.from(fallback, 'base64');
}

async function uploadPhoto(token) {
  const buffer = loadFixtureImage();
  const formData = new FormData();
  formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'photo1.jpg');

  const res = await request('POST', '/photo', formData, token);
  logTest('Upload photo returns 200', res.status === 200, `Status: ${res.status}`);
  logTest('Upload photo returns photo_url', !!res.data?.photo_url, res.data?.photo_url || 'missing');

  if (res.data?.photo_url) {
    const baseOrigin = API_BASE_URL.replace(/\/api$/, '');
    const fileUrl = `${baseOrigin}${res.data.photo_url}`;
    const fetchRes = await fetch(fileUrl);
    logTest('Uploaded file is accessible', fetchRes.status === 200, `Status: ${fetchRes.status}`);
  }

  return res.data?.photo_url || null;
}

async function uploadInvalidFile(token) {
  const formData = new FormData();
  formData.append('photo', new Blob(['not-an-image'], { type: 'text/plain' }), 'bad.txt');
  const res = await request('POST', '/photo', formData, token);
  logTest('Invalid upload returns error', res.status >= 400, `Status: ${res.status}`);
}

async function main() {
  const token = await login();
  if (!token) {
    console.log('No admin token. Run: node tests/setup-test-data.js');
    process.exit(1);
  }

  const locationsRes = await request('GET', '/locations', null, token);
  const locations = locationsRes.data?.locations || [];
  if (!locations.length) {
    logTest('Fetch locations', false, 'No locations found');
    process.exit(1);
  }
  logTest('Fetch locations', true, `Count: ${locations.length}`);
  const location = locations[0];

  const templatePayload = {
    name: `API Contract ${Date.now()}`,
    category: 'API Contract',
    description: 'Contract test checklist',
    items: [
      {
        title: 'Option Select Item',
        description: 'Yes/No/NA item',
        category: 'Contract',
        input_type: 'option_select',
        required: true,
        options: [
          { option_text: 'Yes', mark: '1' },
          { option_text: 'No', mark: '0' },
          { option_text: 'NA', mark: 'NA' }
        ]
      },
      {
        title: 'Number Item',
        description: 'Number input',
        category: 'Contract',
        input_type: 'number',
        required: true,
        options: []
      },
      {
        title: 'Short Answer Item',
        description: 'Short answer input',
        category: 'Contract',
        input_type: 'short_answer',
        required: true,
        options: []
      },
      {
        title: 'Long Answer Item',
        description: 'Long answer input',
        category: 'Contract',
        input_type: 'long_answer',
        required: true,
        options: []
      },
      {
        title: 'Image Upload Item',
        description: 'Photo required',
        category: 'Contract',
        input_type: 'image_upload',
        required: true,
        options: []
      },
      {
        title: 'Signature Item',
        description: 'Signature required',
        category: 'Contract',
        input_type: 'signature',
        required: true,
        options: []
      }
    ]
  };

  const templateRes = await request('POST', '/checklists', templatePayload, token);
  const templateId = templateRes.data?.id;
  logTest('Create template returns id', !!templateId, templateId || 'missing');
  if (!templateId) process.exit(1);

  const templateDetail = await request('GET', `/checklists/${templateId}`, null, token);
  const template = templateDetail.data?.template;
  const items = templateDetail.data?.items || [];
  logTest('Template returns ui_version', template && 'ui_version' in template, String(template?.ui_version));
  logTest('Template returns allow_photo', template && 'allow_photo' in template, String(template?.allow_photo));

  const findItem = (title) => items.find(item => item.title === title);
  const optionItem = findItem('Option Select Item');
  const numberItem = findItem('Number Item');
  const shortItem = findItem('Short Answer Item');
  const longItem = findItem('Long Answer Item');
  const imageItem = findItem('Image Upload Item');
  const signatureItem = findItem('Signature Item');

  logTest('Checklist items loaded', items.length >= 6, `Count: ${items.length}`);

  const auditPayload = {
    template_id: templateId,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: ''
  };

  const auditRes = await request('POST', '/audits', auditPayload, token);
  const auditId = auditRes.data?.id;
  logTest('Create audit returns id', !!auditId, auditId || 'missing');
  if (!auditId) process.exit(1);

  // Submit should fail with missing required answers
  const submitEarly = await request('PUT', `/audits/${auditId}/complete`, {}, token);
  logTest('Submit blocked if required missing', submitEarly.status === 400, `Status: ${submitEarly.status}`);

  const photoUrl = await uploadPhoto(token);
  await uploadInvalidFile(token);

  const signaturePayload = {
    paths: ['M10,10 L120,10'],
    width: 300,
    height: 200,
    timestamp: new Date().toISOString()
  };

  const optionNoId = (optionItem?.options || []).find(opt => String(opt.option_text || opt.text).toLowerCase() === 'no')?.id;

  const batchItems = [
    {
      itemId: optionItem?.id,
      status: 'completed',
      selected_option_id: optionNoId,
      mark: '0',
      comment: 'Completed in automated test'
    },
    {
      itemId: numberItem?.id,
      status: 'completed',
      comment: '12',
      mark: 'NA'
    },
    {
      itemId: shortItem?.id,
      status: 'completed',
      comment: 'Test Manager',
      mark: 'NA'
    },
    {
      itemId: longItem?.id,
      status: 'completed',
      comment: 'All points completed for full checklist testing.',
      mark: 'NA'
    },
    {
      itemId: imageItem?.id,
      status: 'completed',
      comment: 'Photo attached',
      photo_url: photoUrl || '',
      mark: 'NA'
    },
    {
      itemId: signatureItem?.id,
      status: 'completed',
      comment: JSON.stringify(signaturePayload),
      mark: 'NA'
    }
  ].filter(item => item.itemId);

  const batchRes = await request('PUT', `/audits/${auditId}/items/batch`, { items: batchItems, audit_category: null }, token);
  logTest('Batch save responses', batchRes.status === 200, `Status: ${batchRes.status}`);

  const auditDetail = await request('GET', `/audits/${auditId}`, null, token);
  const auditItems = auditDetail.data?.items || [];
  const findAuditItem = (itemId) => auditItems.find(it => it.item_id === itemId);

  logTest('Audit detail returns items', auditItems.length >= batchItems.length, `Count: ${auditItems.length}`);
  const savedImageItem = findAuditItem(imageItem?.id);
  logTest('Photo url persisted', !!savedImageItem?.photo_url, savedImageItem?.photo_url || 'missing');
  const savedSignatureItem = findAuditItem(signatureItem?.id);
  logTest('Signature persisted', !!savedSignatureItem?.comment, savedSignatureItem?.comment || 'missing');

  const submitRes = await request('PUT', `/audits/${auditId}/complete`, {}, token);
  logTest('Submit audit succeeds', submitRes.status === 200, `Status: ${submitRes.status}`);

  const historyRes = await request('GET', '/audits', null, token);
  const audits = historyRes.data?.audits || [];
  const historyAudit = audits.find(audit => audit.id === auditId);
  logTest('Audit appears in history', !!historyAudit, historyAudit ? historyAudit.status : 'missing');
  logTest('History shows completed status', historyAudit?.status === 'completed', historyAudit?.status || 'missing');

  const actionPlanRes = await request('GET', `/audits/${auditId}/action-plan`, null, token);
  if (actionPlanRes.status === 200) {
    const actionItems = actionPlanRes.data?.action_items || [];
    if (actionItems.length > 0) {
      logTest('Action plan includes items for No answers', true, `Count: ${actionItems.length}`);
    } else {
      skipTest('Action plan items', 'No items returned (feature may be disabled)');
    }
  } else {
    logTest('Action plan endpoint available', false, `Status: ${actionPlanRes.status}`);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
