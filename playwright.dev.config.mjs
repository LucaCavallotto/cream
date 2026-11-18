import { defineConfig } from '@playwright/test';
import production from './playwright.config.mjs';

// Keep the test server separate from a developer’s normal Vite session.
const port = Number(process.env.PLAYWRIGHT_DEV_PORT || 5174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...production,
  outputDir: 'test-results/dev',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/dev', open: 'never' }],
  ],
  testMatch: /lifecycle\.spec\.mjs/,
  use: { ...production.use, baseURL },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium-dev', use: { browserName: 'chromium' } }],
});
