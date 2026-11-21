import Papa from 'papaparse';
import {
  test, expect, launch, openRawCSV, row, headers, tab, addModal, saveModal, downloadRows,
} from './fixtures.mjs';

const records = [
  row('Earnings', 1234567.89, 'Income', 'Salary'),
  row('Investment', -234567.89, 'Investments', 'ETFs'),
  row('Review this purchase', -4, '', ''),
];
const csv = () => Papa.unparse({ fields: headers, data: records.map(record => headers.map(field => record[field])) });
const filename = 'A deliberately long personal finance filename for portrait and landscape review.csv';
const protectedDevice = info => info.project.name === 'tablet-ipad';

test('tablet sections preserve layout and navigation in both orientations and themes', async ({ page }, info) => {
  await launch(page);
  if (protectedDevice(info)) await expect(page.locator('#btnCreateNewFile')).toBeHidden();
  else await expect(page.locator('#btnCreateNewFile')).toBeVisible();
  await openRawCSV(page, csv(), filename, { editable: false });
  const portrait = page.viewportSize();
  const orientations = [portrait, { width: portrait.height, height: portrait.width }];
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const viewport of orientations) {
      await page.setViewportSize(viewport);
      for (const [name, id] of [['Overview', 'overview'], ['Transactions', 'list'], ['Analytics', 'analytics'], ['Dataset Health', 'cleanup']]) {
        await page.getByRole('tab', { name, exact: true }).tap();
        await expect(page.locator(`#${id}-tab-pane`)).toHaveCSS('opacity', '1');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: ${colorScheme}, ${viewport.width}`).toBe(true);
        await expect(page.locator('#btnSaveChanges')).toBeHidden();
        if (protectedDevice(info)) await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
        const nav = page.locator('.workspace-sidebar');
        const box = await nav.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        if (box.height < 100) {
          const content = await page.locator(`#${id}-tab-pane`).boundingBox();
          expect(content.y + content.height).toBeLessThanOrEqual(box.y - 24);
        }
      }
      await tab(page, 'Overview');
      await expect(page.locator('#currentFileName')).toHaveText(filename);
      const header = page.locator('.cream-header');
      expect(await header.evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
      expect((await page.locator('#btnCloseFile').boundingBox()).height).toBeGreaterThanOrEqual(44);
      if (protectedDevice(info)) expect((await page.locator('#textViewOnly').boundingBox()).height).toBeGreaterThanOrEqual(44);
      const controls = ['.cream-wordmark', '#currentFileName', '#btnCloseFile'];
      const bounds = await Promise.all(controls.map(selector => page.locator(selector).boundingBox()));
      for (let i = 1; i < bounds.length; i++) {
        const a = bounds[i - 1], b = bounds[i];
        const sameRow = a.y < b.y + b.height && b.y < a.y + a.height;
        if (sameRow) expect(a.x + a.width).toBeLessThanOrEqual(b.x);
      }
      await page.screenshot({ path: info.outputPath(`overview-${viewport.width}-${colorScheme}.png`) });
    }
  }
});

test('tablet exclusion controls and read-only details remain usable without changing the file', async ({ page }, info) => {
  await launch(page);
  await openRawCSV(page, csv(), filename, { editable: false });
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await page.getByText('Exclude categories', { exact: true }).tap();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsAddExclusion').tap();
  await expect(page.locator('#metricExpenses')).toHaveText('€4.00');
  await page.getByText('Exclude transactions', { exact: true }).tap();
  await page.locator('#analyticsExclusionSearch').fill('Review this purchase');
  await page.getByRole('checkbox', { name: /Exclude transaction: Review this purchase/ }).check();
  await expect(page.locator('#metricExpenses')).toHaveText('€0.00');
  await tab(page, 'Transactions');
  await tab(page, 'Analytics');
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('overall');
  await expect(page.locator('#analyticsExclusionCount')).toContainText('1 individual selection');
  await page.locator('#analyticsIncludeAllTransactions').tap();
  await page.locator('#analyticsIncludeAll').tap();
  await expect(page.locator('#metricExpenses')).toHaveText('€234,571.89');
  await tab(page, 'Dataset Health');
  await page.getByRole('button', { name: 'View transaction 3', exact: true }).tap();
  await expect(page.locator('#inputDescription')).toBeDisabled();
  await expect(page.locator('#inlineInput')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});

test('tablet editing follows device protection and keeps exported changes available', async ({ page }, info) => {
  await launch(page);
  await openRawCSV(page, csv(), filename, { editable: false });
  if (protectedDevice(info)) {
    await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
    await page.locator('#textViewOnly').tap();
    await expect(page.getByRole('dialog', { name: 'Read-only mode' })).toContainText('iPad stay read only');
    await page.getByRole('button', { name: 'Got it', exact: true }).tap();
    await expect(page.locator('#btnAddExpense')).toBeHidden();
  } else {
    await page.locator('#btnToggleViewOnly').tap();
    await addModal(page);
    await page.locator('#inlineInput').fill('2026-11-18T12:00:00+01:00, -3, Tablet coffee, Bar, Coffee');
    await saveModal(page);
    const saved = await downloadRows(page);
    expect(saved.rows).toHaveLength(4);
    expect(saved.rows.some(record => record.Description === 'Tablet coffee')).toBe(true);
    await expect(page.locator('#unsavedWarning')).toBeHidden();
    await page.locator('#btnToggleViewOnly').tap();
    await expect(page.locator('#btnAddExpense')).toBeHidden();
  }
});
