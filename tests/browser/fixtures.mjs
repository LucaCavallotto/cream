import { test as base, expect } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Papa from 'papaparse';

export { expect };
export const headers = ['DateTime', 'Amount', 'Description', 'Category', 'Subcategory', 'Tags', 'Notes', 'NeedWant'];
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
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    // Production assets must work without CDN or other external requests.
    await page.route('https://**/*', route => route.abort());
    await page.addInitScript(() => {
      window.showOpenFilePicker = undefined;
      window.showSaveFilePicker = undefined;
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    });
    // Keep calendar expectations stable while allowing Chart.js animations to advance.
    await page.clock.install({ time: new Date('2026-11-18T12:00:00+01:00') });
    await use(page);
    expect(errors, 'Uncaught browser exceptions').toEqual([]);
  }
});

export async function launch(page) {
  const categories = page.waitForResponse('**/data/categories.json');
  await page.goto('/');
  // React enables file actions after the category catalog is ready.
  await (await categories).finished();
  await expect(page.getByRole('button', { name: 'Browse Files', exact: true })).toBeEnabled();
}

export async function openRawCSV(page, text, name = 'test.csv', { editable = true, valid = true } = {}) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Browse Files', exact: true }).click();
  await (await chooserPromise).setFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
  if (!valid) return;
  await expect(page.locator('#currentFileName')).toHaveText(name);
  if (editable) await unlockFile(page);
}

export async function openRows(page, rows) {
  await openRawCSV(page, Papa.unparse({ fields: headers, data: rows.map(row => headers.map(field => row[field] ?? '')) }));
  await expect(page.locator('#appView')).toBeVisible();
  await tab(page, 'Transactions');
}

export async function tab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click();
  const id = { Overview: 'overview', Transactions: 'list', Analytics: 'analytics', 'Dataset Health': 'cleanup' }[name];
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
  await page.locator('#btnConfirmDownload').click();
  return { text, rows: result.data };
}

export async function unlockFile(page) {
  const toggle = page.locator('#btnToggleViewOnly');
  if (await toggle.isVisible() && await toggle.getAttribute('aria-pressed') === 'true') await toggle.click();
}
