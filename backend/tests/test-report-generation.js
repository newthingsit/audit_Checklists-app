/**
 * Report generation smoke test
 * Run with: node tests/test-report-generation.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const isHttps = BASE_URL.startsWith('https');

const adminCredentials = [
  { email: 'admin@lbf.co.in', password: 'Admin123@' },
  { email: 'testadmin@test.com', password: 'Test123!' },
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@admin.com', password: 'admin123' }
];

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }
    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(name, condition) {
  if (!condition) {
    console.error(`✗ ${name}`);
    process.exit(1);
  }
  console.log(`✓ ${name}`);
}

async function login() {
  for (const creds of adminCredentials) {
    try {
      const res = await makeRequest('POST', '/api/auth/login', creds);
      if (res.status === 200 && res.data.token) return res.data.token;
    } catch {
      // try next
    }
  }
  return null;
}

async function main() {
  const token = await login();
  if (!token) {
    console.error('No admin token. Run setup-test-data.js first.');
    process.exit(1);
  }

  const templatesRes = await makeRequest('GET', '/api/checklists', null, token);
  const templates = templatesRes.data.templates || templatesRes.data || [];
  assert('Templates fetched', Array.isArray(templates) && templates.length > 0);

  const locationsRes = await makeRequest('GET', '/api/locations', null, token);
  const locations = locationsRes.data.locations || locationsRes.data || [];
  assert('Locations fetched', Array.isArray(locations) && locations.length > 0);
  const location = locations[0];

  let selectedTemplate = null;
  let templateItems = [];
  for (const template of templates) {
    const detail = await makeRequest('GET', `/api/checklists/${template.id}`, null, token);
    const items = detail.data.items || [];
    if (items.length > 0 && items.length <= 25) {
      selectedTemplate = template;
      templateItems = items;
      break;
    }
  }

  if (!selectedTemplate) {
    console.log('SKIP: No template with <= 25 items found.');
    process.exit(0);
  }

  const auditPayload = {
    template_id: selectedTemplate.id,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: '',
    client_audit_uuid: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  };

  const auditRes = await makeRequest('POST', '/api/audits', auditPayload, token);
  assert('Audit created', auditRes.status === 201 || auditRes.status === 200);
  const auditId = auditRes.data.id;
  assert('Audit ID returned', !!auditId);

  const itemsPayload = templateItems.map(item => {
    const payload = { itemId: item.id, status: 'completed' };
    if (Array.isArray(item.options) && item.options.length > 0) {
      const numericOptions = item.options
        .filter(opt => opt.mark !== 'NA' && opt.mark !== 'N/A')
        .map(opt => ({ ...opt, markValue: Number(opt.mark) }))
        .filter(opt => Number.isFinite(opt.markValue));
      const bestOption = numericOptions.length > 0
        ? numericOptions.sort((a, b) => b.markValue - a.markValue)[0]
        : item.options[0];
      payload.selected_option_id = bestOption.id;
      payload.mark = String(bestOption.mark);
    } else if (item.input_type === 'image_upload') {
      payload.photo_url = '/uploads/test.jpg';
      payload.mark = '100';
    } else {
      payload.comment = 'Report test answer';
      payload.mark = '100';
    }
    return payload;
  });

  const batchRes = await makeRequest(
    'PUT',
    `/api/audits/${auditId}/items/batch`,
    { items: itemsPayload, enforce_required: true },
    token
  );
  assert('Batch update ok', batchRes.status === 200);

  let completed = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const auditDetail = await makeRequest('GET', `/api/audits/${auditId}`, null, token);
    if (auditDetail.data.audit?.status === 'completed') {
      completed = true;
      break;
    }
  }
  assert('Audit completed', completed);

  const reportRes = await makeRequest('GET', `/api/reports/audit/${auditId}/report`, null, token);
  assert('Report endpoint returns 200', reportRes.status === 200);
  assert('Report has summary', !!reportRes.data.summary);
  assert('Report has scoreByCategory', Array.isArray(reportRes.data.scoreByCategory));
  assert('Report has totals', Number(reportRes.data.summary.totalPerfect) > 0);

  console.log('Report generation smoke test passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
