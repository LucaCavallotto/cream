import { test as base, expect } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Papa from 'papaparse';

export { expect };
export const headers = ['DateTime', 'Amount', 'Description', 'Category', 'Subcategory', 'Tags', 'Notes'];
export const row = (Description = 'Coffee', Amount = -1, Category = 'Bar', Subcategory = 'Coffee', DateTime = '2026-11-02T14:28:36+01:00') =>
  ({ DateTime, Amount, Description, Category, Subcategory, Tags: '', Notes: '' });
export const test = base.extend({
  browser: [async ({ browserName, playwright, launchOptions, headless }, use) => {
    // Each Firefox worker owns its app data too: macOS 27 otherwise tries to
    // access the real user's TCC-protected Firefox directory (Playwright #42768).
    const home = browserName === 'firefox' && process.platform === 'darwin'
      ? await mkdtemp(join(tmpdir(), 'expense-tracker-firefox-')) : null;
    const browser = await playwright[browserName].launch({ ...launchOptions, headless,
      ...(home ? { env: { ...process.env, CFFIXED_USER_HOME: home } } : {}) });
    try { await use(browser); }
    finally {
      await browser.close();
      if (home) {
        try { await rm(home, { recursive: true, force: true }); }
        catch (error) {
          // macOS can TCC-protect a generated Documents folder even in this
          // disposable home. Leave that OS-owned temporary remnant to macOS.
          if (!['EACCES', 'EPERM'].includes(error.code)) throw error;
        }
      }
    }
  }, { scope: 'worker' }],
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Real, pinned library distributions replace their CDN transport only.
    await page.route('https://**/*', route => route.abort());
    await page.route('https://cdn.jsdelivr.net/npm/**', async route => {
      const match = new URL(route.request().url()).pathname.match(/^\/npm\/(bootstrap|bootstrap-icons|chart\.js|papaparse)@[^/]+\/(.+)$/);
      if (!match) return route.abort();
      // jsDelivr generates this minified filename; npm ships the same UMD build unminified.
      const asset = match[1] === 'chart.js' && match[2] === 'dist/chart.umd.min.js' ? 'dist/chart.umd.js' : match[2];
      await route.fulfill({ path: resolve('node_modules', match[1], asset) });
    });
    await page.addInitScript(() => {
      window.showOpenFilePicker = undefined;
      window.showSaveFilePicker = undefined;
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    });
    await page.clock.setFixedTime(new Date('2026-11-18T12:00:00+01:00'));
    await use(page);
    expect(errors, 'Uncaught browser exceptions').toEqual([]);
  }
});

export async function launch(page) {
  const categories = page.waitForResponse('**/data/categories.json');
  await page.goto('/');
  // Initialization awaits categories before registering click listeners.
  await (await categories).finished();
  await expect(page.getByRole('button', { name: 'Browse Files', exact: true })).toBeVisible();
}

export async function openRawCSV(page, text, name = 'test.csv') {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Browse Files', exact: true }).click();
  await (await chooserPromise).setFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
}

export async function openRows(page, rows) {
  await openRawCSV(page, Papa.unparse({ fields: headers, data: rows.map(row => headers.map(field => row[field] ?? '')) }));
  await expect(page.locator('#appView')).toBeVisible();
}

export async function tab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click();
  const id = { Transactions: 'list', Analytics: 'analytics', 'Dataset Health': 'cleanup' }[name];
  await expect(page.locator(`#${id}-tab-pane`)).toHaveCSS('opacity', '1');
}

export async function addModal(page) {
  await page.locator('#btnAddExpense').click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
}

export async function saveModal(page) {
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  await expect(page.locator('#expenseModal')).toBeHidden();
}

export async function downloadRows(page) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  const download = await promise;
  const text = await readFile(await download.path(), 'utf8');
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  expect(result.errors).toEqual([]);
  expect(result.meta.fields).toEqual(headers);
  return { text, rows: result.data };
}
