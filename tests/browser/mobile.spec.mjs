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
  await page.getByText('Exclude categories', { exact: true }).click();
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
  expect(ticker.y + ticker.height).toBeLessThanOrEqual(0);
  await expect(page.locator('.cream-header')).toBeInViewport();
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
  await expect(page.locator('.ticker-track')).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('button', { name: 'Resume ticker', exact: true }).tap();
  await expect(
    page.getByRole('button', { name: 'Pause ticker', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.ticker-track')).toHaveCSS('animation-play-state', 'running');
  await expect(page.locator('.money-ticker button')).toHaveCount(0);
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
  const welcome = await page.locator('.landing-welcome').boundingBox();
  const existing = await page.locator('#dropZone').boundingBox();
  expect(existing.y).toBeGreaterThanOrEqual(welcome.y + welcome.height);
  await expect(page.locator('.landing-new-file')).toHaveCount(0);
  await expect(page.locator('.landing-read-only-note')).toContainText('Create and edit your file on a computer.');
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

test('phone labels, all sections and protected navigation remain usable across sizes and themes', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Phone coffee', -10), row('Pay', 100, 'Income', 'Salary'), row('Review', -2, '', '')]);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [320, 390, 430, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      for (const name of ['Overview', 'Transactions', 'Analytics', 'Dataset Health']) {
        await tab(page, name);
        await expect(page.locator('#btnAddExpense')).toBeHidden();
        await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
        await expect(page.locator('#btnSaveChanges')).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${width}px ${colorScheme}`).toBe(true);
      }
      await tab(page, 'Overview');
      await expect(page.locator('.net-hero .eyebrow')).toHaveCSS('font-size', width < 768 ? '13px' : '14px');
      await page.getByRole('button', { name: 'This month.', exact: true }).tap();
      await expect(page.locator('#analyticsTimePeriod')).toHaveValue('current_month');
      await page.getByRole('button', { name: 'cream home', exact: true }).tap();
      await expect(page.locator('#overview-tab-pane')).toBeVisible();
      await expect(page.locator('#currentFileName')).toHaveText('test.csv');
    }
  }
  await tab(page, 'Dataset Health');
  await page.getByRole('button', { name: 'View transaction 3', exact: true }).tap();
  await expect(page.locator('#inputAmount')).toBeDisabled();
  await expect(page.locator('#inputCategory')).toBeDisabled();
  await expect(page.locator('#btnSaveTransaction')).toBeHidden();
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});

test('monthly spending follows desktop information order on small phones while editing stays protected', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Current', -20), row('Previous', -10, 'Bar', 'Coffee', '2026-10-02T12:00:00+02:00')]);
  await tab(page, 'Overview');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = await page.locator('.month-title-row').boundingBox();
    const amount = await page.locator('.spotlight-amount').boundingBox();
    const comparison = await page.locator('.month-comparison').boundingBox();
    expect(amount.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    expect(comparison.y).toBeGreaterThanOrEqual(amount.y + amount.height);
    for (const selector of ['.month-comparison', '.month-baseline']) {
      const parts = page.locator(`${selector} > *`);
      const first = await parts.nth(0).boundingBox(), second = await parts.nth(1).boundingBox();
      expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
      expect(Math.abs(first.y + first.height / 2 - second.y - second.height / 2)).toBeLessThan(8);
    }
    await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
    await expect(page.locator('#btnAddExpense')).toBeHidden();
  }
});

test('mobile chart legends stay readable and health review controls keep a fixed column', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 14 }, (_, i) => row(i ? `Description ${i} with more content than the first one` : 'Short', -10, `Custom category ${i}`, '')));
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await tab(page, 'Analytics');
    const legend = page.locator('.chart-category-legend');
    await expect(legend.locator('li')).toHaveCount(5);
    expect(await legend.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const first = legend.getByRole('button').first();
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('label[for="analyticsTimePeriod"]')).toHaveCSS('font-size', '16px');
    await tab(page, 'Dataset Health');
    const explanation = await page.locator('.health-explainer').boundingBox();
    const summary = await page.locator('.health-summary').boundingBox();
    expect(explanation.y).toBeLessThan(summary.y);
    await page.locator('.health-explainer summary').click();
    await expect(page.locator('#customClassifications')).toBeVisible();
    await page.locator('.health-explainer summary').click();
    const controls = page.locator('#cleanupRecords button');
    const firstBox = await controls.nth(0).boundingBox();
    const secondBox = await controls.nth(1).boundingBox();
    expect(firstBox.x).toBe(secondBox.x);
    expect(firstBox.width).toBe(secondBox.width);
    await expect(page.locator('#cleanupStatus')).toHaveCSS('font-size', '17px');
  }
});

test('phone controls stack left and every section clears the bottom dock', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Missing category', -1, '', '')]);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, id] of [['Overview', 'overview'], ['Transactions', 'list'], ['Analytics', 'analytics'], ['Dataset Health', 'cleanup']]) {
      await tab(page, name);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const content = await page.locator(`#${id}-tab-pane`).boundingBox();
      const dock = await page.locator('.workspace-sidebar').boundingBox();
      expect(content.y + content.height).toBeLessThanOrEqual(dock.y - 24);
    }
    const subtitle = await page.locator('.health-heading .page-description').boundingBox();
    const explanation = await page.locator('.health-explainer').boundingBox();
    expect(explanation.y - subtitle.y - subtitle.height).toBeLessThanOrEqual(10);
    await tab(page, 'Analytics');
    const fields = await page.locator('.analytics-period-controls').boundingBox();
    await expect(page.locator('#clearAnalyticsFilters')).toHaveCount(0);
    const exclusions = await page.locator('#analyticsExclusionsPanel').boundingBox();
    expect(exclusions.y).toBeGreaterThanOrEqual(fields.y + fields.height);
    await tab(page, 'Transactions');
    const search = await page.locator('.ledger-search').boundingBox();
    const count = await page.locator('#transactionResultCount').boundingBox();
    const sort = await page.locator('.ledger-sort').boundingBox();
    expect(count.x).toBe(search.x);
    expect(sort.x).toBe(search.x);
    expect(count.y).toBeGreaterThanOrEqual(sort.y + sort.height);
  }
});

test('the demo exposes only read-only status on smartphones', async ({ page }) => {
  await launch(page);
  await page.getByRole('button', { name: /Take a look around/ }).click();
  for (const width of [320, 390, 844]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
    await expect(page.locator('#textViewOnly')).toBeVisible();
    await expect(page.locator('#btnAddExpense')).toBeHidden();
    await expect(page.locator('#btnSaveChanges')).toBeHidden();
  }
});

test('touch pauses resume at the same ticker position and speed without sticky hover', async ({ page }) => {
  const { expectTickerSpeed, expectTickerPaused, expectTickerResumesAt } = await import('./ticker-motion.mjs');
  await launch(page);
  await expectTickerSpeed(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.locator('.ticker-viewport').tap();
    const paused = await expectTickerPaused(page);
    await page.locator('.ticker-viewport').tap();
    await expectTickerResumesAt(page, paused);
  }
});

test('protected landing offers viewing without a creation section in either theme', async ({ page }, info) => {
  const { checkProtectedLanding } = await import('./protected-landing.mjs');
  await checkProtectedLanding(page, info);
});

test('ticker scrolls away without hiding the phone header or bottom navigation', async ({ page }) => {
  const { checkTickerScroll } = await import('./ticker-scroll.mjs');
  await checkTickerScroll(page);
});
