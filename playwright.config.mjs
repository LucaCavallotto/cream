import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  globalTimeout: 10 * 60 * 1000,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    timezoneId: 'Europe/Rome', locale: 'en-GB',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node tests/helpers/server.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false
  },
  projects: [
    { name: 'chromium', testIgnore: /mobile\.spec\.mjs/, use: { browserName: 'chromium' } },
    { name: 'firefox', testIgnore: /mobile\.spec\.mjs/, use: { browserName: 'firefox' } },
    { name: 'webkit', testIgnore: /mobile\.spec\.mjs/, use: { browserName: 'webkit' } },
    { name: 'mobile-webkit', testMatch: /mobile\.spec\.mjs/, use: { ...devices['iPhone 13'], browserName: 'webkit' } }
  ]
});
