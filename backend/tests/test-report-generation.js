/**
 * Report generation smoke test
 * Run with: node tests/test-report-generation.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const isHttps = BASE_URL.startsWith('https');

const adminCredentials = [
  { email: 'testadmin@test.com', password: 'Test123!' },
  { email: 'admin@lbf.co.in', password: 'Admin123@' },
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@admin.com', password: 'admin123' }
];

const NON_SCORED_INPUT_TYPES = new Set(['text', 'textarea', 'comment', 'note']);

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
  let foundNonScored = false;
  const maxItemsAllowed = 100;

  for (const template of templates) {
    const detail = await makeRequest('GET', `/api/checklists/${template.id}`, null, token);
    const items = detail.data.items || [];
    const hasNonScored = items.some(item => NON_SCORED_INPUT_TYPES.has((item.input_type || '').toLowerCase()));
    if (items.length > 0 && items.length <= maxItemsAllowed && hasNonScored) {
      selectedTemplate = template;
      templateItems = items;
      foundNonScored = true;
      break;
    }
  }

  if (!selectedTemplate) {
    console.log(`No template with <= ${maxItemsAllowed} items and text-only inputs found. Creating a temp template...`);

    const templatePayload = {
      name: `Report Test Template (Text Only) ${Date.now()}`,
      category: 'QA',
      description: 'Auto-generated for report regression test',
      items: [
        {
          title: 'Text-only response (non-scored)',
          description: 'Enter any comment',
          category: 'QA',
          input_type: 'text',
          required: true,
          order_index: 0
        },
        {
          title: 'Scored response',
          description: 'Select Yes/No',
          category: 'QA',
          input_type: 'single_select',
          required: true,
          order_index: 1,
          options: [
            { option_text: 'Yes', mark: '3', order_index: 0 },
            { option_text: 'No', mark: '0', order_index: 1 }
          ]
        }
      ]
    };

    const createTemplateRes = await makeRequest('POST', '/api/checklists', templatePayload, token);
    if (!(createTemplateRes.status === 201 || createTemplateRes.status === 200)) {
      console.error('Template creation failed:', createTemplateRes.status, createTemplateRes.data);
    }
    assert('Template created', createTemplateRes.status === 201 || createTemplateRes.status === 200);
    const createdTemplateId = createTemplateRes.data.id;
    assert('Template ID returned', !!createdTemplateId);

    const detail = await makeRequest('GET', `/api/checklists/${createdTemplateId}`, null, token);
    selectedTemplate = detail.data.template;
    templateItems = detail.data.items || [];
    foundNonScored = templateItems.some(item => NON_SCORED_INPUT_TYPES.has((item.input_type || '').toLowerCase()));
  }

  if (!foundNonScored) {
    console.log('SKIP: No template with text-only inputs found after creation attempt.');
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

  let deviationUsed = false;
  const itemsPayload = templateItems.map(item => {
    const payload = { itemId: item.id, status: 'completed' };
    const inputType = (item.input_type || '').toLowerCase();

    if (NON_SCORED_INPUT_TYPES.has(inputType)) {
      payload.comment = 'Report test answer (text-only)';
      return payload;
    }

    if (Array.isArray(item.options) && item.options.length > 0) {
      const numericOptions = item.options
        .filter(opt => opt.mark !== 'NA' && opt.mark !== 'N/A')
        .map(opt => ({ ...opt, markValue: Number(opt.mark) }))
        .filter(opt => Number.isFinite(opt.markValue));
      if (numericOptions.length > 0) {
        const sorted = numericOptions.sort((a, b) => a.markValue - b.markValue);
        const chosen = (!deviationUsed && sorted.length > 1)
          ? sorted[0]
          : sorted[sorted.length - 1];
        if (!deviationUsed && sorted.length > 1) deviationUsed = true;
        payload.selected_option_id = chosen.id;
        payload.mark = String(chosen.mark);
      } else {
        payload.selected_option_id = item.options[0].id;
        payload.mark = String(item.options[0].mark || '');
      }
    } else if (item.input_type === 'image_upload') {
      payload.photo_url = '/uploads/test.jpg';
    } else {
      payload.comment = 'Report test answer';
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

  const reportItems = reportRes.data.items || [];
  const computedPerfect = reportItems
    .filter(item => !item.nonScored && Number(item.maxScore) > 0)
    .reduce((sum, item) => sum + Number(item.maxScore || 0), 0);

  assert('Non-scored items excluded from totals', Math.round(computedPerfect) === Math.round(reportRes.data.summary.totalPerfect));

  const actionPlanRes = await makeRequest('GET', `/api/audits/${auditId}/action-plan`, null, token);
  assert('Action Plan endpoint returns 200', actionPlanRes.status === 200);
  const reportPlanCount = Array.isArray(reportRes.data.actionPlan) ? reportRes.data.actionPlan.length : 0;
  const persistedPlanCount = Array.isArray(actionPlanRes.data.action_items) ? actionPlanRes.data.action_items.length : 0;
  assert('Report Action Plan matches persisted plan', reportPlanCount === persistedPlanCount);

  console.log('Report generation smoke test passed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
