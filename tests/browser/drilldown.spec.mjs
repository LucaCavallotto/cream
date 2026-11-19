import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';
test('Other subcategory drilldown matches its parent, sign, month and exclusions', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Wanted', -10, 'Shopping', 'Other'), row('Wrong parent', -20, 'Other', 'Other'), row('Refund', 10, 'Shopping', 'Other'), row('Old', -30, 'Shopping', 'Other', '2025-01-02')]);
  await page.getByRole('searchbox').fill('Refund');
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('specific_month');
  await page.locator('#analyticsSpecificMonth').selectOption('2026-11');
  const group = page.locator('#detailedCategoryList [data-breakdown-key="Shopping"]');
  await group.locator('.category-header').click();
  await group.locator('.subcategory-list .btn-filter-tx').click();
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(1);
  await expect(page.locator('#transactionsTbody')).toContainText('Wanted');
  await page.locator('#btnBackToAnalytics').click();
  await expect(page.locator('#inputSearchTransaction')).toHaveValue('Refund');
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('specific_month');
});
