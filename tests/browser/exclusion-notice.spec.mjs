import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

for (const width of [390, 1280]) test(`exclusion notices preserve rules and open their controls at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await launch(page);
  await openRows(page, [row('Coffee', -10), row('Fund', -500, 'Investments', 'ETFs'), row('Salary', 1000, 'Income', 'Salary')]);
  await tab(page, 'Overview');
  await expect(page.locator('.exclusions-notice')).toHaveCount(0);
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await page.getByText('Exclude categories', { exact: true }).click();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Bar'));
  await page.locator('#analyticsExcludeSubcategory').selectOption(JSON.stringify('Coffee'));
  await page.locator('#analyticsAddExclusion').click();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsAddExclusion').click();
  await page.getByText('Exclude transactions', { exact: true }).click();
  await page.getByRole('checkbox', { name: /Exclude transaction: Salary/ }).check();
  await page.locator('#analyticsExclusionsPanel > summary').click();
  await page.locator('#analyticsTransactionExclusionsPanel > summary').click();
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await tab(page, 'Overview');
    const notice = page.locator('#overview-tab-pane .exclusions-notice');
    await expect(notice).toContainText('1 category, 1 subcategory and 1 individual transaction');
    await notice.getByText('Show details', { exact: true }).click();
    await expect(notice.locator('li')).toHaveText(['Investments', 'Bar / Coffee']);
    await notice.getByText('Hide details', { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await notice.getByRole('button', { name: 'Review exclusions' }).click();
    await expect(page.locator('#analytics-tab-pane')).toHaveClass(/active/);
    for (const id of ['analyticsExclusionsPanel', 'analyticsTransactionExclusionsPanel']) await expect(page.locator(`#${id}`)).toHaveAttribute('open', '');
    await expect(page.locator('#analyticsTimePeriod')).toHaveValue('overall');
    await expect(page.locator('#metricIncome')).toHaveText('€0.00');
    await page.locator('#analyticsExclusionsPanel > summary').click();
    await page.locator('#analyticsTransactionExclusionsPanel > summary').click();
    await page.locator('#analytics-tab-pane .exclusions-notice').getByRole('button', { name: 'Review exclusions' }).click();
    await expect(page.locator('#analyticsExclusionsPanel')).toHaveAttribute('open', '');
  }
  await page.locator('#analyticsIncludeAll').click();
  await expect(page.locator('#analytics-tab-pane .exclusions-notice')).toContainText('0 categories, 0 subcategories and 1 individual transaction');
  await page.locator('#analyticsIncludeAllTransactions').click();
  await expect(page.locator('.exclusions-notice')).toHaveCount(0);
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});
