/**
 * Full checklist completion tests for CVR and QA templates.
 * Run with: node tests/full-checklist-completion.test.js
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

const targets = [
  'NEW CVR – CDR Checklist',
  'New QA – CDR'
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
      // try next
    }
  }
  logTest('Login', false, 'No admin credentials worked');
  return null;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');
}

function loadFixtureImage() {
  const fixturePath = path.join(__dirname, '..', '..', 'web', 'tests', 'fixtures', 'photo1.jpg');
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath);
  }
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
  return res.data?.photo_url || null;
}

function pickOptionId(options, index) {
  const normalizedOptions = (options || []).map(opt => ({
    id: opt.id,
    label: normalizeName(opt.option_text || opt.text || opt.title),
    mark: opt.mark
  }));
  const yes = normalizedOptions.find(opt => opt.label === 'yes' || opt.label === 'y');
  const no = normalizedOptions.find(opt => opt.label === 'no' || opt.label === 'n');
  const na = normalizedOptions.find(opt => opt.label === 'na' || opt.label === 'n/a' || opt.label === 'not applicable');

  if ((index + 1) % 25 === 0 && na) return na;
  if ((index + 1) % 10 === 0 && no) return no;
  return yes || normalizedOptions[0] || null;
}

function getShortAnswer(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('dish')) return 'Test Dish';
  if (normalized.includes('manager')) return 'Test Manager';
  if (normalized.includes('table')) return 'T12';
  return 'T12';
}

async function completeChecklist(token, location, template) {
  const detail = await request('GET', `/checklists/${template.id}`, null, token);
  const items = detail.data?.items || [];
  const templateInfo = detail.data?.template || {};

  logTest(`Load items for ${template.name}`, items.length > 0, `Count: ${items.length}`);
  if (!items.length) return false;

  const auditPayload = {
    template_id: template.id,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: ''
  };

  const auditRes = await request('POST', '/audits', auditPayload, token);
  const auditId = auditRes.data?.id;
  logTest(`Create audit for ${template.name}`, !!auditId, auditId || 'missing');
  if (!auditId) return false;

  const photoUrl = await uploadPhoto(token);
  const signaturePayload = {
    paths: ['M10,10 L120,10'],
    width: 300,
    height: 200,
    timestamp: new Date().toISOString()
  };

  const orderedItems = [...items].sort((a, b) => {
    const orderA = Number.isFinite(a.order_index) ? a.order_index : 0;
    const orderB = Number.isFinite(b.order_index) ? b.order_index : 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.id || 0) - (b.id || 0);
  });

  const numberSequence = [12, 15, 18, 20, 22];
  let numberIndex = 0;
  let photoSlots = 0;

  const batchItems = orderedItems.map((item, index) => {
    const inputType = String(item.input_type || item.inputType || 'auto').toLowerCase();
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    const useOptionSelect = inputType === 'option_select' || (inputType === 'auto' && hasOptions);

    const payload = {
      itemId: item.id,
      status: 'completed'
    };

    if (useOptionSelect && hasOptions) {
      const choice = pickOptionId(item.options, index);
      if (choice) {
        payload.selected_option_id = choice.id;
        if (choice.mark !== undefined && choice.mark !== null) {
          payload.mark = choice.mark;
        }
      }
      if ((index + 1) % 7 === 0) {
        payload.comment = 'Completed in automated test';
      }
    } else if (inputType === 'number') {
      payload.comment = String(numberSequence[numberIndex % numberSequence.length]);
      payload.mark = 'NA';
      numberIndex += 1;
    } else if (inputType === 'short_answer') {
      payload.comment = getShortAnswer(item.title);
      payload.mark = 'NA';
    } else if (inputType === 'long_answer' || inputType === 'open_ended' || inputType === 'description') {
      payload.comment = 'All points completed for full checklist testing.';
      payload.mark = 'NA';
    } else if (inputType === 'signature') {
      payload.comment = JSON.stringify(signaturePayload);
      payload.mark = 'NA';
    } else if (inputType === 'image_upload') {
      payload.comment = 'Photo attached';
      payload.mark = 'NA';
    } else {
      payload.mark = 'NA';
    }

    const allowPhoto = templateInfo.allow_photo || inputType === 'image_upload' || useOptionSelect;
    if (allowPhoto && photoUrl && photoSlots < 3) {
      payload.photo_url = photoUrl;
      photoSlots += 1;
    }

    return payload;
  });

  const batchRes = await request('PUT', `/audits/${auditId}/items/batch`, { items: batchItems, audit_category: null }, token);
  logTest(`Batch save ${template.name}`, batchRes.status === 200, `Status: ${batchRes.status}`);

  const submitRes = await request('PUT', `/audits/${auditId}/complete`, {}, token);
  logTest(`Submit ${template.name}`, submitRes.status === 200, `Status: ${submitRes.status}`);

  const auditDetail = await request('GET', `/audits/${auditId}`, null, token);
  logTest(`Audit detail complete for ${template.name}`, auditDetail.data?.audit?.status === 'completed', auditDetail.data?.audit?.status || 'missing');

  return true;
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
  const location = locations[0];

  const templatesRes = await request('GET', '/checklists', null, token);
  const templates = templatesRes.data?.templates || templatesRes.data || [];
  if (!templates.length) {
    logTest('Fetch templates', false, 'No templates found');
    process.exit(1);
  }

  for (const target of targets) {
    const normalizedTarget = normalizeName(target);
    const template = templates.find(t => normalizeName(t.name) === normalizedTarget);

    if (!template) {
      skipTest(`Template ${target}`, 'Not found');
      continue;
    }

    await completeChecklist(token, location, template);
  }

  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
