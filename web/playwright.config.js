const { defineConfig } = require('@playwright/test');

const useRemoteBaseUrl = Boolean(process.env.E2E_BASE_URL);

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: useRemoteBaseUrl ? undefined : {
    command: 'npm start',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      BROWSER: 'none',
      PORT: '3000',
      CI: 'true'
    }
  }
});
