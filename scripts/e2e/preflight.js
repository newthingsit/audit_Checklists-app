#!/usr/bin/env node

const { URL } = require('url');

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
};

const checklistName = getArg('--checklist') || process.env.CHECKLIST_NAME;
const runMode = (getArg('--mode') || process.env.RUN_MODE || 'smoke').toLowerCase();
const apiUrlRaw = getArg('--api') || process.env.API_URL;
const outputPath = getArg('--output') || process.env.PREFLIGHT_OUTPUT;

const requiredVars = ['API_URL', 'TEST_EMAIL', 'TEST_PASSWORD'];
const missingVars = requiredVars.filter(name => !process.env[name]);

const summaryLines = [];
const logSummary = (line = '') => summaryLines.push(line);

const writeOutput = (status, reason = '') => {
  if (!outputPath) return;
  const payload = {
    status,
    reason,
    checklist: checklistName || '',
    runMode,
    apiUrl: apiUrlRaw || ''
  };
  try {
    require('fs').writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.warn('Failed to write preflight output:', error.message);
  }
};

const fail = (message) => {
  console.error(message);
  writeSummary('FAIL', message);
  writeOutput('FAIL', message);
  process.exit(1);
};

const warn = (message) => {
  console.warn(message);
  logSummary(`- Warning: ${message}`);
};

const mask = (value) => {
  if (!value) return 'missing';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
};

const normalizeChecklistName = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');
};

const writeSummary = (status, message) => {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const summary = [
    '## Maestro Preflight',
    `- Status: ${status}`,
    `- Checklist: ${checklistName || 'missing'}`,
    `- Run mode: ${runMode}`,
    `- API_URL: ${apiUrlRaw || 'missing'}`,
    message ? `- Message: ${message}` : null,
    '',
    ...summaryLines
  ].filter(Boolean).join('\n');

  try {
    require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  } catch (error) {
    console.warn('Failed to write step summary:', error.message);
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const loginAndGetToken = async (apiBase) => {
  const loginUrl = `${apiBase}/auth/login`;
  const res = await fetchWithTimeout(
    loginUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_EMAIL,
        password: process.env.TEST_PASSWORD
      })
    },
    10000
  );

  if (!res.ok) {
    fail(`Auth login failed with status ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  const token = data.token || data.accessToken;
  if (!token) {
    fail('Auth login response missing token');
  }

  logSummary('- Auth login OK');
  return token;
};

const run = async () => {
  logSummary('### Environment');
  logSummary(`- API_URL: ${apiUrlRaw || 'missing'}`);
  logSummary(`- TEST_EMAIL: ${mask(process.env.TEST_EMAIL || '')}`);
  logSummary(`- TEST_PASSWORD: ${mask(process.env.TEST_PASSWORD || '')}`);
  logSummary(`- TEST_STORE_ID: ${process.env.TEST_STORE_ID || 'not set'}`);
  logSummary(`- TEST_STORE_NAME: ${process.env.TEST_STORE_NAME || 'not set'}`);

  if (missingVars.length > 0) {
    fail(`Missing required env vars: ${missingVars.join(', ')}`);
  }

  if (!apiUrlRaw) {
    fail('Missing secrets: API_URL');
  }

  if (!checklistName) {
    fail('Checklist not provided');
  }

  let apiUrl;
  try {
    apiUrl = new URL(apiUrlRaw);
  } catch (error) {
    fail(`Invalid API_URL: ${apiUrlRaw}`);
  }

  const apiBase = apiUrlRaw.endsWith('/api') ? apiUrlRaw : `${apiUrlRaw.replace(/\/$/, '')}/api`;

  logSummary('### API Reachability');
  const healthUrl = `${apiBase}/health`;
  let healthOk = false;

  try {
    const res = await fetchWithTimeout(healthUrl, { method: 'GET' }, 8000);
    if (res.ok) {
      healthOk = true;
      logSummary(`- Health check OK: ${healthUrl}`);
    }
  } catch (error) {
    // fall through
  }

  if (!healthOk) {
    const templatesUrl = `${apiBase}/templates`;
    try {
      const res = await fetchWithTimeout(templatesUrl, { method: 'GET' }, 8000);
      if (!res.ok) {
        fail(`API unreachable. Health check failed and ${templatesUrl} returned ${res.status}.`);
      }
      logSummary(`- Fallback check OK: ${templatesUrl}`);
    } catch (error) {
      fail(`API unreachable at ${apiBase}. Error: ${error.message}`);
    }
  }

  logSummary('### Checklist Validation');
  const templatesUrl = `${apiBase}/templates`;
  let templatesRes = await fetchWithTimeout(templatesUrl, { method: 'GET' }, 10000);
  if (templatesRes.status === 401 || templatesRes.status === 403) {
    logSummary('- Templates require auth, attempting login');
    const token = await loginAndGetToken(apiBase);
    templatesRes = await fetchWithTimeout(
      templatesUrl,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      10000
    );
  }
  if (!templatesRes.ok) {
    fail(`Templates fetch failed with status ${templatesRes.status}`);
  }
  const templatesData = await templatesRes.json().catch(() => ({ templates: [] }));
  const templates = templatesData.templates || [];
  const normalizedTarget = normalizeChecklistName(checklistName);
  const found = templates.find(t => normalizeChecklistName(t.name) === normalizedTarget);

  if (!found) {
    const sample = templates.slice(0, 10).map(t => `- ${t.name}`).join('\n');
    fail(`Checklist not found: ${checklistName}\nFirst templates:\n${sample || 'No templates returned'}`);
  }

  logSummary(`- Checklist found: ${found.name}`);

  logSummary('### Upload Endpoint');
  const uploadUrl = `${apiBase}/photo`;
  let uploadOk = false;
  try {
    const res = await fetchWithTimeout(uploadUrl, { method: 'OPTIONS' }, 8000);
    if (res.ok || res.status === 204 || res.status === 405) {
      uploadOk = true;
      logSummary(`- Upload endpoint reachable: ${uploadUrl}`);
    }
  } catch (error) {
    // ignore
  }

  if (!uploadOk) {
    const message = `Upload endpoint not reachable: ${uploadUrl}`;
    if (runMode === 'smoke') {
      fail(message);
    } else {
      warn(message);
    }
  }

  writeOutput('PASS');
  writeSummary('PASS');
  console.log('Preflight checks passed.');
};

run().catch(error => {
  fail(`Preflight failed: ${error.message}`);
});
