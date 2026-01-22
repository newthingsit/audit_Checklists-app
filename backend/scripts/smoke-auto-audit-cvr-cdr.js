const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const EMAIL = process.env.AUDIT_SMOKE_EMAIL || process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.AUDIT_SMOKE_PASSWORD || process.env.SMOKE_TEST_PASSWORD;
const TEMPLATE_NAME = process.env.AUDIT_SMOKE_TEMPLATE || 'CVR - CDR';
const DUMMY_PHOTO_URL = process.env.AUDIT_SMOKE_PHOTO_URL || '/uploads/dummy.png';

const createClient = (token) => axios.create({
  baseURL: API_BASE_URL,
  headers: { Authorization: `Bearer ${token}` }
});

const normalize = (value) => String(value || '').trim().toLowerCase();

const pickYesOption = (options = []) => {
  const yes = options.find(opt => normalize(opt.option_text || opt.text) === 'yes');
  return yes || options[0] || null;
};

const buildSignatureComment = () => JSON.stringify({
  paths: ['M10,10 L60,10 L60,30'],
  width: 200,
  height: 80,
  timestamp: new Date().toISOString()
});

const isSignatureItem = (item) => {
  const title = normalize(item.title);
  const inputType = normalize(item.input_type || item.inputType);
  return inputType === 'signature' || title.includes('signature');
};

const isManagerNameItem = (item) => {
  const title = normalize(item.title);
  return title.includes('manager on duty') || title.includes('manager name');
};

const computeSosAverage = (items, values) => {
  const attempts = [];
  for (let i = 1; i <= 5; i += 1) {
    const attempt = items.find(it => new RegExp(`^time\\s*[–\\-]\\s*attempt\\s*${i}$`, 'i').test((it.title || '').trim()));
    if (!attempt) return null;
    attempts.push(attempt);
  }
  const avgItem = items.find(it => /^average\s*\(auto\)$/i.test((it.title || '').trim()));
  if (!avgItem) return null;
  const nums = attempts.map(it => Number(values[it.id])).filter(n => Number.isFinite(n));
  if (nums.length === 0) return null;
  const avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  return { avgItem, avg };
};

const main = async () => {
  if (!EMAIL || !PASSWORD) {
    console.error('Missing AUDIT_SMOKE_EMAIL/AUDIT_SMOKE_PASSWORD env vars.');
    process.exit(1);
  }

  const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
  const token = loginRes.data.token;
  const client = createClient(token);

  const templatesRes = await client.get('/templates', { params: { dedupe: 'true', _t: Date.now() } });
  const templates = templatesRes.data.templates || [];
  const template = templates.find(t => normalize(t.name) === normalize(TEMPLATE_NAME));
  if (!template) {
    throw new Error(`Template not found: ${TEMPLATE_NAME}`);
  }

  const locationsRes = await client.get('/locations');
  const locations = locationsRes.data.locations || [];
  if (locations.length === 0) {
    throw new Error('No locations available for audit creation.');
  }
  const location = locations[0];

  const checklistRes = await client.get(`/checklists/${template.id}`);
  const items = checklistRes.data.items || [];
  if (items.length === 0) {
    throw new Error('Template has no checklist items.');
  }

  const auditCreateRes = await client.post('/audits', {
    template_id: template.id,
    restaurant_name: location.name,
    location: location.store_number ? `Store ${location.store_number}` : location.name,
    location_id: location.id,
    notes: 'Automated smoke test'
  });
  const auditId = auditCreateRes.data.id;

  const answerValues = {};
  items.forEach(item => {
    const inputType = normalize(item.input_type || item.inputType);
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    if (isSignatureItem(item)) {
      answerValues[item.id] = buildSignatureComment();
      return;
    }
    if (isManagerNameItem(item)) {
      answerValues[item.id] = 'Test Manager';
      return;
    }
    if (hasOptions) {
      return;
    }
    if (inputType === 'image_upload') {
      answerValues[item.id] = 'photo';
      return;
    }
    answerValues[item.id] = '1';
  });

  const sosAverage = computeSosAverage(items, answerValues);
  if (sosAverage) {
    answerValues[sosAverage.avgItem.id] = sosAverage.avg;
  }

  const batchItems = items.map(item => {
    const inputType = normalize(item.input_type || item.inputType);
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    const update = { itemId: item.id, status: 'completed' };

    if (hasOptions) {
      const option = pickYesOption(item.options);
      if (option) {
        update.selected_option_id = option.id;
      }
      return update;
    }

    if (inputType === 'image_upload') {
      update.photo_url = DUMMY_PHOTO_URL;
      update.mark = 'NA';
      return update;
    }

    update.comment = answerValues[item.id] || '1';
    update.mark = 'NA';
    return update;
  });

  await client.put(`/audits/${auditId}/items/batch`, { items: batchItems, audit_category: null });

  const auditRes = await client.get(`/audits/${auditId}`);
  const audit = auditRes.data.audit;
  const categoryScores = auditRes.data.categoryScores || {};

  const pendingCategories = Object.entries(categoryScores).filter(([, data]) => {
    const total = data.totalItems || 0;
    const completed = data.completedItems || 0;
    return total > 0 && completed < total;
  });

  const reportRes = await client.get(`/reports/audit/${auditId}/report`);

  console.log('Smoke test results:', {
    auditId,
    auditStatus: audit?.status,
    pendingCategories: pendingCategories.map(([name]) => name),
    reportLoaded: !!reportRes.data,
    templateUsed: template.name
  });

  if (audit?.status !== 'completed') {
    throw new Error(`Audit status is ${audit?.status || 'unknown'}`);
  }
  if (pendingCategories.length > 0) {
    throw new Error(`Pending categories detected: ${pendingCategories.map(([name]) => name).join(', ')}`);
  }
  if (!reportRes.data || !reportRes.data.summary) {
    throw new Error('Report response missing summary data.');
  }

  console.log('Smoke test PASSED');
};

main().catch((error) => {
  console.error('Smoke test FAILED:', error.message);
  process.exit(1);
});
