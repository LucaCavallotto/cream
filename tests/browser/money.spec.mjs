import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

async function expectSpaced(locator) {
  await expect(locator).toBeVisible();
  const boxes = await locator.locator(':scope > span').evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, bottom: r.bottom };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].x - boxes[i - 1].right).toBeGreaterThan(1);
}

test('currency spacing is shared across ledger overview analytics ticker health and read-only details', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Salary', 100, 'Income', 'Salary'), row('Coffee', -10), row('Needs category', -2, '', '')]);
  await expectSpaced(page.locator('#transactionsTbody .amount-cell .money-amount').first());
  await tab(page, 'Overview');
  await expectSpaced(page.locator('#overviewNet .money-amount'));
  await expectSpaced(page.locator('#overviewIncome .money-amount'));
  await tab(page, 'Analytics');
  await expectSpaced(page.locator('#metricDelta .money-amount'));
  await expectSpaced(page.locator('#metricExpenses .money-amount'));
  await page.locator('#detailedCategoryList .category-header').first().click();
  await expectSpaced(page.locator('#detailedCategoryList .subcategory-list.show .money-amount').first());
  await page.getByText('Exclude categories', { exact: true }).click();
  await page.getByText('Exclude transactions', { exact: true }).click();
  await expectSpaced(page.locator('#analyticsTransactionExclusionsPanel label .money-amount').first());
  await page.locator('#btnToggleViewOnly').click();
  await tab(page, 'Dataset Health');
  const notice = await page.locator('#cleanupReadOnly').boundingBox();
  const summary = await page.locator('.health-summary').boundingBox();
  expect(notice.y + notice.height).toBeLessThanOrEqual(summary.y);
  await expectSpaced(page.locator('#cleanupRecords .money-amount').first());
  await page.getByRole('button', { name: 'View transaction 3', exact: true }).click();
  await expect(page.locator('#inputAmount')).toHaveValue('−\u202f€\u202f2.00');
});
