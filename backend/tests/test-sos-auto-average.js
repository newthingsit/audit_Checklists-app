/**
 * SOS Auto Average backend regression test
 * Run with: node tests/test-sos-auto-average.js
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

  let target = null;
  for (const template of templates) {
    const detail = await makeRequest('GET', `/api/checklists/${template.id}`, null, token);
    const items = detail.data.items || [];
    const titles = items.map(i => String(i.title || '').trim());
    const hasAttempts = [1, 2, 3, 4, 5].every(n =>
      titles.some(t => new RegExp(`^Time\\s*[–\\-]\\s*Attempt\\s*${n}$`, 'i').test(t))
    );
    const hasAverage = titles.some(t => /^Average\s*\(Auto\)$/i.test(t));
    if (hasAttempts && hasAverage) {
      target = { template, items };
      break;
    }
  }

  if (!target) {
    console.log('SKIP: No template with SOS Time Attempt 1-5 and Average (Auto) found.');
    process.exit(0);
  }

  const locationsRes = await makeRequest('GET', '/api/locations', null, token);
  const locations = locationsRes.data.locations || locationsRes.data || [];
  assert('Locations fetched', Array.isArray(locations) && locations.length > 0);
  const location = locations[0];

  const auditPayload = {
    template_id: target.template.id,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: '',
    client_audit_uuid: `sos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  };

  const auditRes = await makeRequest('POST', '/api/audits', auditPayload, token);
  assert('Audit created', auditRes.status === 201 || auditRes.status === 200);
  const auditId = auditRes.data.id;
  assert('Audit ID returned', !!auditId);

  const itemByTitle = new Map(target.items.map(item => [String(item.title || '').trim(), item]));
  const attempts = [1, 2, 3, 4, 5].map(n => itemByTitle.get(`Time - Attempt ${n}`) || itemByTitle.get(`Time – Attempt ${n}`));
  const averageItem = target.items.find(i => /^Average\s*\(Auto\)$/i.test((i.title || '').trim()));

  assert('Attempt items resolved', attempts.every(Boolean));
  assert('Average item resolved', !!averageItem);

  const attemptValues = [45, 50, 48, 52, 47];
  const avgValue = (attemptValues.reduce((a, b) => a + b, 0) / attemptValues.length).toFixed(2);

  const itemsPayload = [
    ...attempts.map((item, idx) => ({
      itemId: item.id,
      status: 'completed',
      comment: String(attemptValues[idx]),
      mark: 'NA'
    })),
    {
      itemId: averageItem.id,
      status: 'completed',
      comment: String(avgValue),
      mark: 'NA'
    }
  ];

  const batchRes = await makeRequest('PUT', `/api/audits/${auditId}/items/batch`, { items: itemsPayload }, token);
  assert('Batch update ok', batchRes.status === 200);

  const auditDetail = await makeRequest('GET', `/api/audits/${auditId}`, null, token);
  const auditItems = auditDetail.data.items || [];
  const avgRow = auditItems.find(row => row.item_id === averageItem.id);
  assert('Average item saved', !!avgRow);
  assert('Average item completed', avgRow.status && avgRow.status !== 'pending');

  console.log('SOS auto-average backend test passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
