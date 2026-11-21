import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import production from './playwright.config.mjs';

// Keep the test server separate from a developer’s normal Vite session.
const port = Number(process.env.PLAYWRIGHT_DEV_PORT || 5174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...production,
  outputDir: fileURLToPath(new URL('../test-results/dev', import.meta.url)),
  reporter: [
    ['list'],
    ['html', { outputFolder: fileURLToPath(new URL('../playwright-report/dev', import.meta.url)), open: 'never' }],
  ],
  testMatch: /lifecycle\.spec\.mjs/,
  use: { ...production.use, baseURL },
  webServer: {
    cwd: production.webServer.cwd,
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium-dev', use: { browserName: 'chromium' } }],
});
