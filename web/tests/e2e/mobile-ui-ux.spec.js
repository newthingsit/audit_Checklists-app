const { test, expect, request } = require('@playwright/test');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL || 'http://localhost:5000';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/i);
}

async function getApiContext(page) {
  const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
  expect(token).toBeTruthy();
  return request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function startAuditFromChecklist(page, api) {
  const locationsRes = await api.get('/api/locations');
  expect(locationsRes.ok()).toBeTruthy();
  const locationsData = await locationsRes.json();
  const locations = locationsData.locations || [];
  expect(locations.length).toBeGreaterThan(0);

  await page.goto('/checklists');

  const startButton = page.getByRole('button', { name: /start audit/i }).first();
  await expect(startButton).toBeVisible();

  const startBox = await startButton.boundingBox();
  expect(startBox).toBeTruthy();
  expect(startBox.height).toBeGreaterThanOrEqual(44);

  await startButton.click();

  const storeInput = page.locator('main input[aria-autocomplete="list"]').first();
  await storeInput.click();
  await storeInput.fill(locations[0].name);
  await page.getByRole('option', { name: new RegExp(`^${escapeRegex(locations[0].name)}$`, 'i') }).first().click();
  await page.getByRole('button', { name: /next/i }).click();

  await page.waitForURL(/\/audit\/\d+/i);
}

test.describe('Mobile UI/UX Audit Experience', () => {
  test('mobile touch targets and layout are iOS-friendly', async ({ page }, testInfo) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');
    test.skip(testInfo.project.name !== 'Mobile Safari', 'This test is scoped to iOS Safari only');

    await login(page);
    const api = await getApiContext(page);

    try {
      await startAuditFromChecklist(page, api);

      const tabButton = page.locator('.MuiTabs-root [role="tab"]').first();
      await expect(tabButton).toBeVisible();
      const tabBox = await tabButton.boundingBox();
      expect(tabBox).toBeTruthy();
      expect(tabBox.height).toBeGreaterThanOrEqual(44);
      expect(tabBox.width).toBeGreaterThanOrEqual(44);

      const saveButton = page.getByTestId('save-button').first();
      const submitButton = page.getByTestId('submit-button').first();
      await expect(saveButton).toBeVisible();
      await expect(submitButton).toBeVisible();

      const saveBox = await saveButton.boundingBox();
      const submitBox = await submitButton.boundingBox();
      expect(saveBox).toBeTruthy();
      expect(submitBox).toBeTruthy();
      expect(saveBox.height).toBeGreaterThanOrEqual(44);
      expect(saveBox.width).toBeGreaterThanOrEqual(44);
      expect(submitBox.height).toBeGreaterThanOrEqual(44);
      expect(submitBox.width).toBeGreaterThanOrEqual(44);

      const dockStyles = await saveButton.evaluate((el) => {
        const dock = el.closest('.mobile-bottom-actions');
        if (!dock) return null;
        const style = window.getComputedStyle(dock);
        return {
          borderRadius: style.borderRadius,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || ''
        };
      });

      expect(dockStyles).toBeTruthy();
      expect(dockStyles.borderRadius).not.toBe('0px');

      const optionButton = page.locator('[data-testid^="option-"]').first();
      const optionCount = await optionButton.count();
      expect(optionCount).toBeGreaterThan(0);
      await expect(optionButton).toBeVisible();
      const optionBox = await optionButton.boundingBox();
      expect(optionBox).toBeTruthy();
      expect(optionBox.height).toBeGreaterThanOrEqual(44);
      expect(optionBox.width).toBeGreaterThanOrEqual(44);

      const commentInput = page.getByTestId('comment-input').first();
      if (await commentInput.count()) {
        await expect(commentInput).toBeVisible();
        const fontSize = await commentInput.evaluate((el) => window.getComputedStyle(el).fontSize);
        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
      }

      const photoButton = page.getByTestId('photo-button').first();
      if (await photoButton.count()) {
        const photoBox = await photoButton.boundingBox();
        expect(photoBox).toBeTruthy();
        expect(photoBox.height).toBeGreaterThanOrEqual(44);
        expect(photoBox.width).toBeGreaterThanOrEqual(44);
        await expect(photoButton).toContainText(/photo|evidence/i);
      }
    } finally {
      await api.dispose();
    }
  });
});
