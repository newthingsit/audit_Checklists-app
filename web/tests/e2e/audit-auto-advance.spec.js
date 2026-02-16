const { test, expect, request } = require('@playwright/test');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:5000';

const normalizeCategoryName = (name) => {
  if (!name) return '';
  let normalized = String(name).trim().replace(/\s+/g, ' ');
  normalized = normalized.replace(/\s*&\s*/g, ' & ');
  normalized = normalized.replace(/\s+and\s+/gi, ' & ');
  normalized = normalized.replace(/\s*–\s*/g, ' - ');
  normalized = normalized.replace(/\s*-\s*/g, ' - ');
  normalized = normalized.replace(/\bAcknowledgment\b/gi, 'Acknowledgement');
  return normalized;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loginUi = async (page) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('debugAutoAdvance', '1');
    window.localStorage.setItem('debugAutoAdvance', '1');
  });
  page.on('console', (msg) => {
    if (msg.text().includes('[auto-advance]')) {
      console.log(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[pageerror] ${err.message}`);
  });
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/i);
};

const buildBatchItems = (items) => items.map((item) => {
  const payload = { itemId: item.id, status: 'completed' };
  if (Array.isArray(item.options) && item.options.length > 0) {
    const yesOption = item.options.find((opt) => String(opt.option_text || opt.text || '').trim().toLowerCase() === 'yes');
    const selected = yesOption || item.options[0];
    if (selected?.id) payload.selected_option_id = selected.id;
  } else if (item.input_type === 'image_upload') {
    payload.photo_url = '/uploads/test.jpg';
    payload.mark = 'NA';
  } else if (['number', 'time'].includes(item.input_type)) {
    payload.input_value = '5';
    payload.mark = '5';
  } else if (item.input_type === 'date') {
    payload.input_value = new Date().toISOString().slice(0, 16);
    payload.mark = 'NA';
  } else if (['open_ended', 'description', 'short_answer', 'long_answer', 'scan_code'].includes(item.input_type)) {
    payload.input_value = 'E2E prefill';
    payload.comment = 'E2E prefill';
    payload.mark = 'NA';
  } else if (item.input_type === 'signature') {
    payload.input_value = 'signed';
    payload.mark = 'NA';
  } else {
    payload.comment = 'E2E prefill';
    payload.mark = 'NA';
  }
  return payload;
});

const prepareAuditForCategory = async (api, templateId, location, items, targetCategory, excludeIds) => {
  const restaurantName = location.name || location.restaurant_name || location.location_name;
  const auditRes = await api.post('/api/audits', {
    data: {
      template_id: parseInt(templateId, 10),
      restaurant_name: restaurantName,
      location: location.store_number ? `Store ${location.store_number}` : restaurantName,
      location_id: parseInt(location.id, 10),
      notes: 'Auto-advance E2E'
    }
  });
  const auditText = await auditRes.text();
  expect(auditRes.ok(), `Create audit failed: ${auditRes.status()} ${auditText}`).toBeTruthy();
  const auditData = auditText ? JSON.parse(auditText) : {};
  const auditId = auditData.id;

  const categoriesInOrder = [];
  items.forEach((item) => {
    const cat = normalizeCategoryName(item.category);
    if (cat && !categoriesInOrder.includes(cat)) categoriesInOrder.push(cat);
  });

  const targetIndex = categoriesInOrder.indexOf(targetCategory);
  const categoriesBefore = targetIndex >= 0 ? categoriesInOrder.slice(0, targetIndex) : [];

  const itemsToComplete = items.filter((item) => {
    const cat = normalizeCategoryName(item.category);
    if (categoriesBefore.includes(cat)) return true;
    if (cat === targetCategory) return !excludeIds.includes(item.id);
    return false;
  });

  const batchItems = buildBatchItems(itemsToComplete);
  const batchRes = await api.put(`/api/audits/${auditId}/items/batch`, {
    data: { items: batchItems, audit_category: null, enforce_required: false }
  });
  expect(batchRes.ok()).toBeTruthy();

  return { auditId, categoriesInOrder };
};

test.describe.serial('Audit auto-advance', () => {
  test('auto-advance after Average (Auto) completion', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await loginUi(page);
    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    await page.evaluate(() => sessionStorage.setItem('debugAutoAdvance', '1'));
    await page.evaluate(() => localStorage.setItem('debugAutoAdvance', '1'));

    const api = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });

    const templatesRes = await api.get('/api/templates?dedupe=true');
    expect(templatesRes.ok()).toBeTruthy();
    const templates = (await templatesRes.json()).templates || [];
    const template = templates.find((t) => normalizeCategoryName(t.name) === normalizeCategoryName('NEW CVR - CDR Checklist'));
    expect(template).toBeTruthy();

    const locationsRes = await api.get('/api/locations');
    expect(locationsRes.ok()).toBeTruthy();
    const location = (await locationsRes.json()).locations?.[0];
    expect(location).toBeTruthy();

    const checklistRes = await api.get(`/api/checklists/${template.id}`);
    expect(checklistRes.ok()).toBeTruthy();
    const checklist = await checklistRes.json();
    const items = checklist.items || [];

    const avgItem = items.find((item) => /^Average\s*\(Auto\)$/i.test((item.title || '').trim()));
    test.skip(!avgItem, 'Average (Auto) item not found');

    const avgCategory = normalizeCategoryName(avgItem.category);
    const attemptItems = items.filter((item) => {
      if (normalizeCategoryName(item.category) !== avgCategory) return false;
      return /^Time\s*[–-]\s*Attempt\s*[1-5]$/i.test((item.title || '').trim());
    });
    test.skip(attemptItems.length < 5, 'Time Attempt items not found');

    const { auditId, categoriesInOrder } = await prepareAuditForCategory(
      api,
      template.id,
      location,
      items,
      avgCategory,
      attemptItems.map((i) => i.id).concat([avgItem.id])
    );

    const nextCategory = categoriesInOrder[categoriesInOrder.indexOf(avgCategory) + 1];
    test.skip(!nextCategory, 'No next category to advance to');

    await page.goto(`/audit/${auditId}?debugAutoAdvance=1`);
    await page.getByRole('button', { name: /resume audit/i }).click();

    await page.getByRole('tablist').waitFor();
    await page.waitForTimeout(1000);
    const debugState = await page.evaluate(() => ({
      debug: window.__autoAdvanceDebug || null,
      search: window.location.search,
      debugFlag: window.sessionStorage.getItem('debugAutoAdvance'),
      debugLocal: window.localStorage.getItem('debugAutoAdvance')
    }));
    console.log('[auto-advance-debug-init]', JSON.stringify(debugState));

    const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
    await expect(activeTab).toContainText(new RegExp(escapeRegex(avgCategory.slice(0, 10)), 'i'));

    for (const attempt of attemptItems) {
      const card = page.getByTestId('question-card').filter({ hasText: new RegExp(escapeRegex(attempt.title), 'i') }).first();
      await card.scrollIntoViewIfNeeded();
      await card.locator('input[type="number"]').fill('5');
    }

    const debugInfo = await page.evaluate(() => window.__autoAdvanceDebug || null);
    if (debugInfo) {
      console.log('[auto-advance-debug]', JSON.stringify(debugInfo));
    }

    const avgCard = page.getByTestId('question-card').filter({ hasText: /Average\s*\(Auto\)/i }).first();
    const avgInput = avgCard.getByTestId('number-input');
    await expect(avgInput).toHaveValue(/\d/);

    await expect(page.locator('[role="tab"][aria-selected="true"]').first())
      .toContainText(new RegExp(escapeRegex(nextCategory.slice(0, 10)), 'i'), { timeout: 15000 });
  });

  test('auto-advance after signature save', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await loginUi(page);
    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    await page.evaluate(() => sessionStorage.setItem('debugAutoAdvance', '1'));
    await page.evaluate(() => localStorage.setItem('debugAutoAdvance', '1'));

    const api = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });

    const templatesRes = await api.get('/api/templates?dedupe=true');
    expect(templatesRes.ok()).toBeTruthy();
    const templates = (await templatesRes.json()).templates || [];
    const template = templates.find((t) => normalizeCategoryName(t.name) === normalizeCategoryName('NEW CVR - CDR Checklist'));
    expect(template).toBeTruthy();

    const locationsRes = await api.get('/api/locations');
    expect(locationsRes.ok()).toBeTruthy();
    const location = (await locationsRes.json()).locations?.[0];
    expect(location).toBeTruthy();

    const checklistRes = await api.get(`/api/checklists/${template.id}`);
    expect(checklistRes.ok()).toBeTruthy();
    const checklist = await checklistRes.json();
    const items = checklist.items || [];

    const signatureItem = items.find((item) => String(item.input_type || '').toLowerCase() === 'signature' || /signature/i.test(item.title || ''));
    test.skip(!signatureItem, 'Signature item not found');

    const signatureCategory = normalizeCategoryName(signatureItem.category);

    const { auditId, categoriesInOrder } = await prepareAuditForCategory(
      api,
      template.id,
      location,
      items,
      signatureCategory,
      [signatureItem.id]
    );

    const nextCategory = categoriesInOrder[categoriesInOrder.indexOf(signatureCategory) + 1];
    test.skip(!nextCategory, 'No next category to advance to');

    await page.goto(`/audit/${auditId}?debugAutoAdvance=1`);
    await page.getByRole('button', { name: /resume audit/i }).click();

    await page.getByRole('tablist').waitFor();
    await page.waitForTimeout(1000);
    const debugState = await page.evaluate(() => ({
      debug: window.__autoAdvanceDebug || null,
      search: window.location.search,
      debugFlag: window.sessionStorage.getItem('debugAutoAdvance'),
      debugLocal: window.localStorage.getItem('debugAutoAdvance')
    }));
    console.log('[auto-advance-debug-init]', JSON.stringify(debugState));

    const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
    await expect(activeTab).toContainText(new RegExp(escapeRegex(signatureCategory.slice(0, 10)), 'i'));

    const signatureCard = page.getByTestId('question-card').filter({ hasText: /signature/i }).first();
    await signatureCard.scrollIntoViewIfNeeded();
    await signatureCard.getByTestId('signature-button').click();

    const canvas = page.getByTestId('signature-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const startX = box.x + box.width * 0.2;
    const startY = box.y + box.height * 0.5;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + box.width * 0.5, startY + box.height * 0.2);
    await page.mouse.move(startX + box.width * 0.7, startY + box.height * 0.6);
    await page.mouse.up();

    await page.getByRole('button', { name: /save signature/i }).click();

    const debugInfo = await page.evaluate(() => window.__autoAdvanceDebug || null);
    if (debugInfo) {
      console.log('[auto-advance-debug]', JSON.stringify(debugInfo));
    }

    await expect(page.locator('[role="tab"][aria-selected="true"]').first())
      .toContainText(new RegExp(escapeRegex(nextCategory.slice(0, 10)), 'i'));
  });
});
