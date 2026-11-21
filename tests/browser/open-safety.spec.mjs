import { test, expect, launch, openRows, row, addModal, saveModal, headers } from './fixtures.mjs';
import Papa from 'papaparse';
const replacement = Papa.unparse({ fields: headers, data: [headers.map(key => row('Replacement')[key])] });

async function prepare(page) {
  await page.addInitScript(text => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      if (this.name === 'slow.csv') return new Promise(resolve => { window.releaseSlow = () => resolve(text); });
      return read.call(this);
    };
  }, replacement);
  await launch(page); await openRows(page, [row('Original')]);
}
async function slowOpen(page) {
  await page.locator('input[type=file]').setInputFiles({ name: 'slow.csv', mimeType: 'text/csv', buffer: Buffer.from(replacement) });
  await page.waitForFunction(() => typeof window.releaseSlow === 'function');
}

test('a slow open checks current unsaved edits when the replacement is ready', async ({ page }) => {
  await prepare(page); await slowOpen(page);
  await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -2, Pending addition'); await saveModal(page);
  const dialog = page.waitForEvent('dialog');
  const release = page.evaluate(() => window.releaseSlow());
  expect((await dialog).message()).toContain('unsaved changes');
  await (await dialog).dismiss(); await release;
  await expect(page.locator('#currentFileName')).toHaveText('test.csv');
  await expect(page.locator('#transactionsTbody')).toContainText('Pending addition');
  await expect(page.locator('#unsavedWarning')).toBeVisible();
});

test('closing a file invalidates a pending open', async ({ page }) => {
  await prepare(page); await slowOpen(page);
  await page.locator('#btnCloseFile').click();
  await page.evaluate(() => window.releaseSlow());
  await expect(page.locator('#landingView')).toBeVisible();
  await expect(page.locator('#currentFileName')).toHaveCount(0);
});

test('a late older file cannot replace a more recently opened file', async ({ page }) => {
  await prepare(page); await slowOpen(page);
  await page.locator('input[type=file]').setInputFiles({ name: 'newer.csv', mimeType: 'text/csv', buffer: Buffer.from(replacement) });
  await expect(page.locator('#currentFileName')).toHaveText('newer.csv');
  await page.evaluate(() => window.releaseSlow());
  await expect(page.locator('#currentFileName')).toHaveText('newer.csv');
});

test('a delayed demo request cannot replace a personal file opened afterwards', async ({ page }) => {
  let release;
  const requested = new Promise(resolve => {
    page.route('**/demo.csv', route => { release = () => route.fulfill({ contentType: 'text/csv', body: replacement }); resolve(); });
  });
  await launch(page);
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await requested;
  await page.locator('input[type=file]').setInputFiles({ name: 'personal.csv', mimeType: 'text/csv', buffer: Buffer.from(replacement) });
  await expect(page.locator('#currentFileName')).toHaveText('personal.csv');
  const response = page.waitForResponse('**/demo.csv');
  await release();
  await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#currentFileName')).toHaveText('personal.csv');
  await expect(page.locator('#demoNotice')).toHaveCount(0);
});
