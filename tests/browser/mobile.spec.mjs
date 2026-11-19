import { test, expect, launch, openRows, openRawCSV, row, tab } from './fixtures.mjs';

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

test('read-only mobile header stays on one row and explains how to edit on a computer', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' }),
  );
  await launch(page);
  await openRows(page, [row()]);
  const header = await page.locator('.cream-header').boundingBox();
  expect(header.height).toBe(72);
  await expect(page.locator('.cream-wordmark .cream-star')).toBeVisible();
  await expect(page.locator('.file-status')).toBeHidden();
  await page.getByRole('button', { name: 'Read only', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('on a computer');
  await page.getByRole('button', { name: 'Got it', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#textViewOnly')).toBeFocused();
});

test('smartphone inspection hides write-only entry controls and shows local human dates', async ({ page }) => {
  await launch(page);
  await expect(page.locator('#btnCreateNewFile')).toBeHidden();
  await openRows(page, [row('Timezone sample', -1, 'Bar', 'Coffee', '2026-11-02T23:30:36-05:00')]);
  await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
  await expect(page.locator('#btnSelectMode')).toBeHidden();
  await expect(page.locator('#transactionsTbody')).toContainText('03-11-2026 05:30');
  await expect(page.locator('#transactionsTbody')).not.toContainText('05:30:36');
  await page.locator('#transactionsTbody .mobile-row-click').click();
  await expect(page.locator('#inlineInput')).toBeHidden();
  await expect(page.locator('.transaction-display-date')).toContainText('03-11-2026 05:30:36');
});


test('phone header keeps brand filename read-only badge and close aligned without overlap', async ({ page }) => {
  await launch(page);
  await openRawCSV(page, 'DateTime,Amount,Description,Category,Subcategory,Tags,Notes\n2026-11-02,-1,Coffee,Bar,Coffee,,', 'a-very-long-personal-finance-filename-for-2026.csv');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const header = page.locator('.cream-header.has-file');
    await expect(header).toHaveCSS('height', '72px');
    const boxes = await Promise.all(['.brand-lockup', '.file-context', '#textViewOnly', '#btnCloseFile'].map(selector => header.locator(selector).boundingBox()));
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].width).toBeGreaterThan(0);
      expect(boxes[i].x).toBeGreaterThanOrEqual(0);
      expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(width);
      if (i) expect(boxes[i - 1].x + boxes[i - 1].width).toBeLessThanOrEqual(boxes[i].x);
    }
    expect(boxes[2].height).toBeGreaterThanOrEqual(44);
    expect(boxes[3].height).toBeGreaterThanOrEqual(44);
    expect(await page.locator('#currentFileName').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Read only', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Got it', exact: true }).tap();
  await page.locator('#btnCloseFile').tap();
  await expect(page.locator('#landingView')).toBeVisible();
});
