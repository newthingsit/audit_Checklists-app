const { test, expect, request } = require('@playwright/test');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:5000';

test.describe('Audit E2E Smoke', () => {
  test('create audit, save multiple times, verify report', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/i);

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
    expect(templates.length).toBeGreaterThan(0);

    const locationsRes = await api.get('/api/locations');
    expect(locationsRes.ok()).toBeTruthy();
    const locationsData = await locationsRes.json();
    const locations = locationsData.locations || [];
    expect(locations.length).toBeGreaterThan(0);
    const location = locations[0];

    const auditsBeforeRes = await api.get('/api/audits');
    const auditsBeforeData = await auditsBeforeRes.json();
    const auditsBefore = auditsBeforeData.audits || [];

    await page.goto('/checklists');
    await page.getByRole('button', { name: /start audit/i }).first().click();

    const storeInput = page.locator('main input[aria-autocomplete="list"]').first();
    await storeInput.click();
    await storeInput.fill(location.name);
    await page.getByRole('option', { name: new RegExp(location.name, 'i') }).first().waitFor({ state: 'visible' });
    await page.getByRole('option', { name: new RegExp(location.name, 'i') }).first().click();

    await page.getByRole('button', { name: /next/i }).click();

    const saveDraftBtn = page.getByRole('button', { name: /save draft/i }).first();
    for (let i = 0; i < 5; i += 1) {
      await saveDraftBtn.click();
      await page.waitForTimeout(300);
    }

    await page.waitForURL(/\/audit\/\d+/i);
    const auditId = Number(page.url().split('/').pop());
    expect(Number.isFinite(auditId)).toBeTruthy();

    const auditsAfterRes = await api.get('/api/audits');
    const auditsAfterData = await auditsAfterRes.json();
    const auditsAfter = auditsAfterData.audits || [];
    expect(auditsAfter.length).toBe(auditsBefore.length + 1);

    const auditDetailRes = await api.get(`/api/audits/${auditId}`);
    const auditDetail = await auditDetailRes.json();
    const templateId = auditDetail.audit?.template_id;
    expect(templateId).toBeTruthy();

    const templateRes = await api.get(`/api/checklists/${templateId}`);
    const templateDetail = await templateRes.json();
    const items = templateDetail.items || [];
    expect(items.length).toBeGreaterThan(0);

    const batchItems = items.map((item) => {
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
        payload.comment = 'E2E test answer';
        payload.mark = '100';
      }
      return payload;
    });

    const batchRes = await api.put(`/api/audits/${auditId}/items/batch`, {
      items: batchItems,
      audit_category: null,
      enforce_required: true
    });
    expect(batchRes.ok()).toBeTruthy();

    let completed = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const statusRes = await api.get(`/api/audits/${auditId}`);
      const statusData = await statusRes.json();
      if (statusData.audit?.status === 'completed') {
        completed = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    expect(completed).toBeTruthy();

    const reportRes = await api.get(`/api/reports/audit/${auditId}/report`);
    expect(reportRes.ok()).toBeTruthy();
    const report = await reportRes.json();
    expect(report.summary?.totalPerfect).toBeGreaterThan(0);
    expect(Array.isArray(report.scoreByCategory)).toBeTruthy();

    await page.goto(`/audit/${auditId}/report`);
    await expect(page.getByText(/report/i)).toBeVisible();
    await expect(page.getByText(/score by category/i)).toBeVisible();
  });
});
