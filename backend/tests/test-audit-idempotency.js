/**
 * Audit idempotency test
 * Run with: node tests/test-audit-idempotency.js
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

function isAdminLoginResponse(data) {
  const role = String(data?.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;
  const permissions = data?.user?.permissions || [];
  return Array.isArray(permissions) && permissions.includes('*');
}

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
      if (res.status === 200 && res.data.token && isAdminLoginResponse(res.data)) {
        return res.data.token;
      }
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
  const templateId = templates[0].id;

  const locationsRes = await makeRequest('GET', '/api/locations', null, token);
  const locations = locationsRes.data.locations || locationsRes.data || [];
  assert('Locations fetched', Array.isArray(locations) && locations.length > 0);
  const location = locations[0];

  const templateDetail = await makeRequest('GET', `/api/checklists/${templateId}`, null, token);
  const items = templateDetail.data.items || [];
  assert('Checklist items fetched', Array.isArray(items) && items.length > 0);

  const clientAuditUuid = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const auditPayload = {
    template_id: templateId,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: '',
    client_audit_uuid: clientAuditUuid
  };

  const firstCreate = await makeRequest('POST', '/api/audits', auditPayload, token);
  assert('First audit create returns 201/200', firstCreate.status === 201 || firstCreate.status === 200);
  const auditId = firstCreate.data.id;
  assert('Audit ID returned', !!auditId);

  const secondCreate = await makeRequest('POST', '/api/audits', auditPayload, token);
  assert('Second audit create returns 200', secondCreate.status === 200);
  assert('Second audit create dedupes to same ID', secondCreate.data.id === auditId);

  const batchItems = items.slice(0, 3).map(item => ({
    itemId: item.id,
    status: 'completed',
    comment: 'Test answer',
    mark: 'NA'
  }));

  const batchPayload = { items: batchItems, audit_category: null };
  const batch1 = await makeRequest('PUT', `/api/audits/${auditId}/items/batch`, batchPayload, token);
  assert('First batch update ok', batch1.status === 200);
  const batch2 = await makeRequest('PUT', `/api/audits/${auditId}/items/batch`, batchPayload, token);
  assert('Second batch update ok', batch2.status === 200);

  const auditDetail = await makeRequest('GET', `/api/audits/${auditId}`, null, token);
  const auditItems = auditDetail.data.items || [];
  const itemIds = auditItems.map(i => i.item_id);
  const uniqueItemIds = new Set(itemIds);
  assert('No duplicate audit_items in response', itemIds.length === uniqueItemIds.size);

  console.log('Audit idempotency test passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
