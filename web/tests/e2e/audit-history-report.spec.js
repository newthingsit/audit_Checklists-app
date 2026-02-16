const { test, expect } = require('@playwright/test');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const auditUrl = process.env.E2E_AUDIT_URL || 'https://app.litebitefoods.com/audit/701';
const reportUrl = process.env.E2E_REPORT_URL || '';

const login = async (page) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  try {
    await page.waitForURL(/dashboard/i, { timeout: 15000 });
  } catch {
    await page.waitForLoadState('domcontentloaded');
  }
};

const expectAnyVisible = async (locators) => {
  for (const locator of locators) {
    if (await locator.count()) {
      await expect(locator.first()).toBeVisible();
      return true;
    }
  }
  throw new Error('Expected at least one matching element to be visible.');
};

const goToAuditHistory = async (page) => {
  const linkCandidates = [
    page.getByRole('link', { name: /audit history/i }),
    page.getByRole('button', { name: /audit history/i }),
    page.getByText(/audit history/i)
  ];

  for (const candidate of linkCandidates) {
    if (await candidate.count()) {
      await candidate.first().click();
      return;
    }
  }

  await page.goto('/audits');
};

const getTopDeviationRows = async (page) => {
  const heading = page.getByText(/action plan\s*-\s*top\s*3\s*deviation/i).first();
  await expect(heading).toBeVisible();

  const container = heading.locator('xpath=ancestor::*[self::section or self::div][1]');
  let table = container.locator('table').first();
  if (!(await table.count())) {
    const sibling = container.locator('xpath=following-sibling::*[1]');
    table = sibling.locator('table').first();
  }

  const rows = table.locator('tbody tr');
  return rows;
};

const assertDownloadPdf = async (page) => {
  const downloadButton = page.getByRole('button', { name: /download pdf/i });
  if (await downloadButton.count()) {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await downloadButton.first().click();
    const download = await downloadPromise;
    await download.delete().catch(() => null);
  }
};

test.describe('Audit history and report checks', () => {
  test('audit history, report, signature, action plan, top deviations', async ({ page }) => {
    test.skip(!email || !password, 'E2E_EMAIL/E2E_PASSWORD must be set');

    await login(page);

    const auditIdMatch = auditUrl.match(/\/audit\/(\d+)/i);
    const auditId = auditIdMatch ? auditIdMatch[1] : null;

    await goToAuditHistory(page);
    await page.waitForURL(/audit|history|audits/i);

    if (auditId) {
      const auditRow = page.locator(`text=/\\b${auditId}\\b/`);
      if (await auditRow.count()) {
        await expect(auditRow.first()).toBeVisible();
      }
    }

    await page.goto(auditUrl, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/audit\/\d+/i);

    await assertDownloadPdf(page);

    const viewReportButton = page.getByRole('button', { name: /view report/i });
    const viewReportLink = page.getByRole('link', { name: /view report/i });
    const targetReportUrl = reportUrl || (auditId ? `/audit/${auditId}/report` : null);
    if (await viewReportButton.count()) {
      await viewReportButton.first().click();
    } else if (await viewReportLink.count()) {
      await viewReportLink.first().click();
    } else if (targetReportUrl) {
      await page.goto(targetReportUrl, { waitUntil: 'domcontentloaded' });
    }

    await page.waitForURL(/\/report/i);
    await page.waitForLoadState('networkidle');
    const progressBar = page.locator('[role="progressbar"], .MuiLinearProgress-root');
    if (await progressBar.count()) {
      await progressBar.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(async () => {
        await progressBar.first().waitFor({ state: 'detached', timeout: 15000 });
      });
    }

    await expectAnyVisible([
      page.getByText(/action plan/i),
      page.getByRole('heading', { name: /action plan/i })
    ]);

    await expectAnyVisible([
      page.getByText(/top\s*3\s*deviation/i),
      page.getByRole('heading', { name: /top\s*3\s*deviation/i })
    ]);

    const deviationRows = await getTopDeviationRows(page);
    await expect(deviationRows).toHaveCount(3);

    for (let i = 0; i < 3; i += 1) {
      const row = deviationRows.nth(i);
      await expect(row.getByText(/open|closed/i)).toBeVisible();
    }

    await expectAnyVisible([
      page.locator('img[alt*="signature" i]'),
      page.locator('[data-testid*="signature" i]'),
      page.getByText(/signature/i)
    ]);
  });
});
