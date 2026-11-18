import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

test('mobile layout inspects transactions and health records without allowing edits', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' }));
  await launch(page);
  await openRows(page, [row('Mobile coffee'), row('Needs classification', -1, '', '')]);
  await expect(page.locator('#btnAddExpense')).toBeHidden();
  await page.locator('#transactionsTbody .mobile-row-click').first().click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#inputDescription')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupReadOnly')).toBeVisible();
  await page.getByRole('button', { name: 'View transaction 2', exact: true }).click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#inputCategory')).toBeDisabled();
});

test('mobile analytics exclusions are usable and do not overflow the viewport', async ({ page }) => {
  await launch(page);
  await openRows(page, [row(), row('ETF', -500, 'Investments', 'ETFs')]);
  await tab(page, 'Analytics');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeAll').click();
  await expect(page.locator('#metricExpenses')).toHaveText('€0.00');
  await page.getByRole('button', { name: 'Remove exclusion: Bar', exact: true }).click();
  await expect(page.locator('#metricExpenses')).toHaveText('€1.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
