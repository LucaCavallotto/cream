import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

for (const width of [390, 1280]) test(`expanded tags show expense categories and update with scope at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await launch(page);
  const tagged = (...args) => ({ ...row(...args), Tags: '#trip' });
  await openRows(page, [tagged('Lunch', -20, 'Food & Dining', 'Restaurant'),
    tagged('Coffee', -10), tagged('Refund', 100, 'Income', 'Salary'),
    tagged('Missing classification', -3, '', ''),
    tagged('Earlier', -90, 'Travel', 'Transport', '2026-10-01'),
    { ...row('Salary', 200, 'Income', 'Salary'), Tags: '#income' }]);
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('current_month');
  await page.getByRole('button', { name: 'Toggle #trip breakdown', exact: true }).click();
  const detail = page.getByRole('group', { name: 'Spending categories for #trip', exact: true });
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await expect(detail.locator('.subcategory-item')).toHaveText(['Food & Dining−€20.00', 'Bar−€10.00', 'Uncategorized−€3.00']);
    await expect(detail).not.toContainText('Income');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Toggle #income breakdown', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Spending categories for #income', exact: true })).toContainText('No expenses for this tag in the selected period.');
  await page.getByText('Exclude categories', { exact: true }).click();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Bar'));
  await page.locator('#analyticsExcludeSubcategory').selectOption(JSON.stringify('Coffee'));
  await page.locator('#analyticsAddExclusion').click();
  await expect(detail.locator('.subcategory-item')).toHaveCount(2);
  await page.getByText('Exclude transactions', { exact: true }).click();
  await page.getByRole('checkbox', { name: /Exclude transaction: Missing classification/ }).check();
  await expect(detail.locator('.subcategory-item')).toHaveText(['Food & Dining−€20.00']);
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await expect(detail.locator('.subcategory-item')).toHaveText(['Travel−€90.00', 'Food & Dining−€20.00']);
  await tab(page, 'Overview');
  await tab(page, 'Analytics');
  await expect(detail).toBeVisible();
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});
