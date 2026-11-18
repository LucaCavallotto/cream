import { defineConfig } from '@playwright/test';
import production from './playwright.config.mjs';

export default defineConfig({
  ...production,
  outputDir: 'test-results/dev',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/dev', open: 'never' }],
  ],
  testMatch: /lifecycle\.spec\.mjs/,
  use: { ...production.use, baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium-dev', use: { browserName: 'chromium' } }],
});
