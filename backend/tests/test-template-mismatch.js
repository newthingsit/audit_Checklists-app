/**
 * Template mismatch prevention test (QA-QSR vs QA-CDR)
 * Run with: node tests/test-template-mismatch.js
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

  const templatesRes = await makeRequest('GET', '/api/templates?dedupe=true', null, token);
  const templates = templatesRes.data.templates || [];
  assert('Templates fetched', Array.isArray(templates) && templates.length > 0);

  const qaQsr = templates.find(t => /qa/i.test(t.name) && /qsr/i.test(t.name));
  const qaCdr = templates.find(t => /qa/i.test(t.name) && /cdr/i.test(t.name));

  if (!qaQsr || !qaCdr) {
    console.log('SKIP: QA-QSR or QA-CDR templates not found.');
    process.exit(0);
  }

  const locationsRes = await makeRequest('GET', '/api/locations', null, token);
  const locations = locationsRes.data.locations || locationsRes.data || [];
  assert('Locations fetched', Array.isArray(locations) && locations.length > 0);
  const location = locations[0];

  const templateDetails = await makeRequest('GET', `/api/checklists/${qaQsr.id}`, null, token);
  const qsrItems = new Set((templateDetails.data.items || []).map(i => i.id));
  const templateDetailsCdr = await makeRequest('GET', `/api/checklists/${qaCdr.id}`, null, token);
  const cdrItems = new Set((templateDetailsCdr.data.items || []).map(i => i.id));

  const createAudit = async (templateId, label) => {
    const payload = {
      template_id: templateId,
      restaurant_name: location.name,
      location: location.store_number ? `Store ${location.store_number}` : location.name,
      location_id: location.id,
      notes: '',
      client_audit_uuid: `${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };
    const res = await makeRequest('POST', '/api/audits', payload, token);
    assert(`${label} audit create ok`, res.status === 201 || res.status === 200);
    return res.data.id;
  };

  const qsrAuditId = await createAudit(qaQsr.id, 'qsr');
  const qsrAudit = await makeRequest('GET', `/api/audits/${qsrAuditId}`, null, token);
  assert('QSR audit template matches', qsrAudit.data.audit?.template_id === qaQsr.id);
  const qsrAuditItems = (qsrAudit.data.items || []).map(i => i.item_id);
  assert('QSR audit items belong to QSR template', qsrAuditItems.every(id => qsrItems.has(id)));

  const cdrAuditId = await createAudit(qaCdr.id, 'cdr');
  const cdrAudit = await makeRequest('GET', `/api/audits/${cdrAuditId}`, null, token);
  assert('CDR audit template matches', cdrAudit.data.audit?.template_id === qaCdr.id);
  const cdrAuditItems = (cdrAudit.data.items || []).map(i => i.item_id);
  assert('CDR audit items belong to CDR template', cdrAuditItems.every(id => cdrItems.has(id)));

  console.log('Template mismatch prevention test passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
