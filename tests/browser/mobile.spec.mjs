import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

test('mobile layout inspects transactions and health records without allowing edits', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' }),
  );
  await launch(page);
  await openRows(page, [
    row('Mobile coffee'),
    row('Needs classification', -1, '', ''),
  ]);
  await expect(page.locator('#btnAddExpense')).toBeHidden();
  await expect(page.locator('#btnSaveChanges')).toBeHidden();
  await expect(page.locator('#btnUndoChanges')).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator('#transactionsTbody .mobile-row-click').first().click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#inputDescription')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupReadOnly')).toBeVisible();
  await page
    .getByRole('button', { name: 'View transaction 2', exact: true })
    .click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#inputCategory')).toBeDisabled();
});

test('mobile analytics exclusions are usable and do not overflow the viewport', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row(), row('ETF', -500, 'Investments', 'ETFs')]);
  await tab(page, 'Analytics');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeAll').click();
  await expect(page.locator('#metricExpenses')).toHaveText('€0.00');
  await page
    .getByRole('button', { name: 'Remove exclusion: Bar', exact: true })
    .click();
  await expect(page.locator('#metricExpenses')).toHaveText('€1.00');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('mobile bottom navigation, dataset ticker and ledger sorting remain usable while scrolling', async ({
  page,
}) => {
  await launch(page);
  await openRows(
    page,
    Array.from({ length: 24 }, (_, i) =>
      row(`Mobile transaction ${i}`, -(i + 1)),
    ),
  );
  await page.locator('#transactionSort').selectOption('Amount:desc');
  await expect(
    page.locator('#transactionsTbody .mobile-row-click').first(),
  ).toContainText('Mobile transaction 0');
  await page.locator('#transactionSort').selectOption('Amount:asc');
  await expect(
    page.locator('#transactionsTbody .mobile-row-click').first(),
  ).toContainText('Mobile transaction 23');
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const ticker = await page.locator('.money-ticker').boundingBox();
  expect(ticker.y).toBeGreaterThanOrEqual(0);
  expect(ticker.y + ticker.height).toBeLessThanOrEqual(150);
  const navigation = await page.locator('#appTabs').boundingBox();
  const viewportHeight = await page.evaluate(() => innerHeight);
  expect(navigation.y).toBeGreaterThan(viewportHeight - 100);
  expect(navigation.y + navigation.height).toBeLessThanOrEqual(viewportHeight);
  await tab(page, 'Overview');
  await expect(page.locator('#overviewNet')).toHaveText('−€300.00');
  await expect(page.locator('#overviewNet')).toBeInViewport();
  await page.getByRole('button', { name: 'Pause ticker', exact: true }).tap();
  await expect(
    page.getByRole('button', { name: 'Resume ticker', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume ticker', exact: true }).tap();
  await expect(
    page.getByRole('button', { name: 'Pause ticker', exact: true }),
  ).toBeVisible();
});
