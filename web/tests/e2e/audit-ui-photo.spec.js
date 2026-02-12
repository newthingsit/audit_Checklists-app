const { test, expect, request } = require('@playwright/test');
const path = require('path');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:5000';

const normalizeName = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const findTemplateByName = (templates, targetName) => {
  const normalizedTarget = normalizeName(targetName);
  return templates.find((template) => normalizeName(template.name) === normalizedTarget);
};

const getLocation = (locations) => {
  if (!Array.isArray(locations) || locations.length === 0) return null;
  return locations[0];
};

const login = async (page) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/i);
};

const startAudit = async (page, templateId, locationName) => {
  await page.goto(`/audit/new/${templateId}`);
  const storeInput = page.getByLabel(/Store|Outlet/i);
  await storeInput.click();
  await storeInput.fill(locationName);
  await page.getByRole('option', { name: new RegExp(locationName, 'i') }).first().click();
  await page.getByRole('button', { name: /next/i }).click();
};

const drawSignature = async (page) => {
  const canvas = page.getByTestId('signature-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) return;
  const startX = box.x + box.width * 0.2;
  const startY = box.y + box.height * 0.5;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.5, startY + box.height * 0.2);
  await page.mouse.move(startX + box.width * 0.7, startY + box.height * 0.6);
  await page.mouse.up();
  await page.getByRole('button', { name: /save signature/i }).click();
};

const fillCard = async (page, card, state, photoPath) => {
  const text = (await card.textContent()) || '';
  const normalizedText = text.toLowerCase();

  const optionYes = card.getByTestId('option-yes');
  const optionNo = card.getByTestId('option-no');
  const optionNa = card.getByTestId('option-na');
  const optionButtons = card.locator('button[data-testid^="option-"]');

  const hasOptions = (await optionButtons.count()) > 0;
  if (hasOptions) {
    if (state.questionIndex % 25 === 0 && await optionNa.count()) {
      await optionNa.first().click();
    } else if (state.questionIndex % 10 === 0 && await optionNo.count()) {
      await optionNo.first().click();
    } else if (await optionYes.count()) {
      await optionYes.first().click();
    } else if (await optionButtons.count()) {
      await optionButtons.first().click();
    }
  }

  const numberInputs = card.getByTestId('number-input');
  const numberCount = await numberInputs.count();
  for (let i = 0; i < numberCount; i += 1) {
    const input = numberInputs.nth(i);
    if (await input.isDisabled()) continue;
    const value = state.numberPattern[state.numberIndex % state.numberPattern.length];
    state.numberIndex += 1;
    await input.fill(String(value));
  }

  const shortInputs = card.getByTestId('short-answer-input');
  const shortCount = await shortInputs.count();
  for (let i = 0; i < shortCount; i += 1) {
    const input = shortInputs.nth(i);
    if (await input.isDisabled()) continue;
    let value = 'Test Value';
    if (normalizedText.includes('table number')) value = 'T12';
    else if (normalizedText.includes('dish name')) value = 'Test Dish';
    else if (normalizedText.includes('manager name') || normalizedText.includes('manager on duty')) value = 'Test Manager';
    await input.fill(value);
  }

  const longInputs = card.getByTestId('long-answer-input');
  const longCount = await longInputs.count();
  for (let i = 0; i < longCount; i += 1) {
    const input = longInputs.nth(i);
    if (await input.isDisabled()) continue;
    await input.fill('Testing remarks completed successfully.');
  }

  const commentInput = card.getByTestId('comment-input');
  if (state.questionIndex % 7 === 0 && await commentInput.count()) {
    await commentInput.first().fill('Automated QA comment.');
  }

  const photoInput = card.getByTestId('photo-upload-input');
  if (await photoInput.count()) {
    const isImageUploadOnly = !hasOptions;
    if (isImageUploadOnly || state.photoUploads < 3) {
      await photoInput.setInputFiles(photoPath);
      state.photoAdded = true;
      if (!isImageUploadOnly) state.photoUploads += 1;
    }
  }

  const signatureButton = card.getByTestId('signature-button');
  if (await signatureButton.count()) {
    await signatureButton.first().click();
    await drawSignature(page);
    state.signatureAdded = true;
  }

  state.questionIndex += 1;
};

const fillChecklist = async (page, templateId, locationName, photoPath) => {
  await startAudit(page, templateId, locationName);
  await page.waitForSelector('[data-testid="question-card"]');

  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  const state = {
    questionIndex: 1,
    photoUploads: 0,
    photoAdded: false,
    signatureAdded: false,
    numberIndex: 0,
    numberPattern: [12, 15, 18, 20, 22]
  };

  const fillVisibleCards = async () => {
    const cards = page.getByTestId('question-card');
    const cardCount = await cards.count();
    for (let i = 0; i < cardCount; i += 1) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await fillCard(page, card, state, photoPath);
    }
  };

  if (tabCount > 1) {
    for (let tabIndex = 1; tabIndex < tabCount; tabIndex += 1) {
      await tabs.nth(tabIndex).click();
      await page.waitForSelector('[data-testid="question-card"]');
      await fillVisibleCards();
    }
  } else {
    await fillVisibleCards();
  }

  const pendingCount = await page.getByTestId('pending-required-count').count();
  if (pendingCount > 0) {
    await expect.poll(async () => {
      const text = await page.getByTestId('pending-required-count').first().innerText();
      const match = text.match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    }).toBe(0);
  }

  await page.getByTestId('save-button').first().click();
  await page.waitForURL(/\/audit\/(\d+)/i);
  const auditId = Number(page.url().split('/').pop());

  const resumeButton = page.getByRole('button', { name: /resume audit/i });
  if (await resumeButton.count()) {
    await resumeButton.first().click();
    await page.waitForURL(/\/audit\/new\//i);
  }

  if (state.photoAdded) {
    await expect(page.getByTestId('photo-preview').first()).toBeVisible();
  }
  if (state.signatureAdded) {
    await expect(page.getByTestId('signature-preview').first()).toBeVisible();
  }

  await page.getByTestId('submit-button').first().click();
  await page.waitForURL(/\/audit\/(\d+)/i);

  return auditId;
};

test.describe.serial('Audit UI/photo fix', () => {
  test.setTimeout(30 * 60 * 1000);

  test('CVR checklist end-to-end', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await login(page);

    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const api = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    const templatesRes = await api.get('/api/templates?dedupe=true');
    expect(templatesRes.ok()).toBeTruthy();
    const templatesData = await templatesRes.json();
    const templates = templatesData.templates || [];

    const locationsRes = await api.get('/api/locations');
    expect(locationsRes.ok()).toBeTruthy();
    const locationsData = await locationsRes.json();
    const location = getLocation(locationsData.locations || []);
    expect(location).toBeTruthy();

    const cvrTemplate = findTemplateByName(templates, 'NEW CVR - CDR Checklist');
    expect(cvrTemplate).toBeTruthy();

    const cvrTemplateRes = await api.get(`/api/checklists/${cvrTemplate.id}`);
    expect(cvrTemplateRes.ok()).toBeTruthy();
    const cvrPayload = await cvrTemplateRes.json();
    expect(cvrPayload.template?.ui_version).toBe(2);
    expect(cvrPayload.template?.allow_photo).toBeTruthy();

    const photoPath = path.join(__dirname, '../fixtures/photo1.jpg');
    const auditId = await fillChecklist(page, cvrTemplate.id, location.name, photoPath);

    const auditRes = await api.get(`/api/audits/${auditId}`);
    expect(auditRes.ok()).toBeTruthy();
    const auditData = await auditRes.json();
    expect(auditData.audit?.status).toBe('completed');

    const reportRes = await api.get(`/api/reports/audit/${auditId}/report`);
    expect(reportRes.ok()).toBeTruthy();

    await page.goto(`/audit/${auditId}/report`);
    await expect(page.getByText(/report/i)).toBeVisible();
    await expect(page.locator('img[alt="Audit"]').first()).toBeVisible();
  });

  test('QA checklist end-to-end', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await login(page);

    const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const api = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    const templatesRes = await api.get('/api/templates?dedupe=true');
    expect(templatesRes.ok()).toBeTruthy();
    const templatesData = await templatesRes.json();
    const templates = templatesData.templates || [];

    const locationsRes = await api.get('/api/locations');
    expect(locationsRes.ok()).toBeTruthy();
    const locationsData = await locationsRes.json();
    const location = getLocation(locationsData.locations || []);
    expect(location).toBeTruthy();

    const qaTemplate = findTemplateByName(templates, 'New QA - CDR');
    expect(qaTemplate).toBeTruthy();

    const qaTemplateRes = await api.get(`/api/checklists/${qaTemplate.id}`);
    expect(qaTemplateRes.ok()).toBeTruthy();
    const qaPayload = await qaTemplateRes.json();
    expect(qaPayload.template?.ui_version).toBe(2);
    expect(qaPayload.template?.allow_photo).toBeTruthy();

    const photoPath = path.join(__dirname, '../fixtures/photo1.jpg');
    const auditId = await fillChecklist(page, qaTemplate.id, location.name, photoPath);

    const auditRes = await api.get(`/api/audits/${auditId}`);
    expect(auditRes.ok()).toBeTruthy();
    const auditData = await auditRes.json();
    expect(auditData.audit?.status).toBe('completed');

    const reportRes = await api.get(`/api/reports/audit/${auditId}/report`);
    expect(reportRes.ok()).toBeTruthy();

    await page.goto(`/audit/${auditId}/report`);
    await expect(page.getByText(/report/i)).toBeVisible();
    await expect(page.locator('img[alt="Audit"]').first()).toBeVisible();
  });
});
