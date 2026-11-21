import {
  test,
  expect,
  launch,
  openRows,
  row,
  tab,
  addModal,
  saveModal,
} from './fixtures.mjs';

test('cream opens the bundled demo in Overview and the shortcuts reach real data and records', async ({
  page,
}) => {
  await launch(page);
  await expect(page).toHaveTitle('cream');
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await expect(page.locator('#appView')).toBeVisible();
  await expect(page.locator('#overview-tab-pane')).toBeVisible();
  await expect(page.locator('#currentFileName')).toHaveText('demo.csv');
  await expect(page.locator('#overviewNet')).toHaveText('+€5,436.53');
  await expect(page.locator('#overviewExpenses')).toHaveText('€2,271.97');
  await page
    .getByRole('button', { name: 'Review dataset', exact: false })
    .click();
  await expect(page.locator('#cleanupDirty')).toHaveText('3');
  await tab(page, 'Overview');
  await page.locator('.recent-transaction').first().click();
  await expect(page.locator('#inputDescription')).toHaveValue(
    'Other shopping purchase',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /View all transactions/ }).click();
  await expect(page.locator('#list-tab-pane')).toBeVisible();
  await expect(
    page.locator('#transactionsTbody .mobile-row-click'),
  ).toHaveCount(31);
});

test('overview and ticker use all-time included totals while activity and dataset health keep every record', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [
    row('Salary', 1000, 'Income', 'Salary'),
    row('Coffee', -10),
    row('Investment', -500, 'Investments', 'ETFs'),
    row('Broken', 'bad'),
  ]);
  await tab(page, 'Overview');
  await expect(page.locator('#overviewNet')).toHaveText('+€490.00');
  const ticker = page.locator('.ticker-group').first();
  await expect(ticker).toContainText('+€490.00');
  await tab(page, 'Analytics');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page
    .locator('#analyticsExcludeCategory')
    .selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsAddExclusion').click();
  await tab(page, 'Overview');
  await expect(page.locator('#overviewNet')).toHaveText('+€990.00');
  await expect(page.locator('#overviewExpenses')).toHaveText('€10.00');
  await expect(ticker).toContainText('+€990.00');
  await expect(ticker).toContainText('NEEDS REPAIR');
  await expect(page.locator('.recent-transaction')).toHaveCount(4);
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupTotal')).toHaveText('4');
  await expect(page.locator('#cleanupDirty')).toHaveText('1');
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('ticker can pause and resume and respects reduced motion with keyboard-scrollable static values', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row()]);
  await page.getByRole('button', { name: 'Pause ticker', exact: true }).click();
  await expect(page.locator('.ticker-track')).toHaveCSS(
    'animation-play-state',
    'paused',
  );
  await page
    .getByRole('button', { name: 'Resume ticker', exact: true })
    .click();
  await expect(page.locator('.ticker-track')).toHaveCSS(
    'animation-play-state',
    'running',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.ticker-track')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(page.locator('.ticker-viewport')).toHaveCSS(
    'overflow-x',
    'auto',
  );
  await expect(page.locator('.ticker-group').nth(1)).toBeHidden();
  await expect(page.locator('.ticker-group').first()).toContainText('EXPENSES');
});

test('workspace tabs support arrow-key navigation and maintain a single keyboard entry point', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row()]);
  await page.locator('#overview-tab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#list-tab')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#analytics-tab')).toBeFocused();
  await expect(page.locator('#analytics-tab')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.locator('#cleanup-tab')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#overview-tab')).toBeFocused();
  await expect(page.locator('#appTabs [tabindex="0"]')).toHaveCount(1);
});

test('all sections and the editor reflow across narrow phones, tablets and desktop without page overflow', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [
    row('A fairly long transaction description for a smaller screen', -1234.56),
    row('Income', 2500, 'Income', 'Salary'),
  ]);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      'Overview',
      'Transactions',
      'Analytics',
      'Dataset Health',
    ]) {
      await tab(page, name);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} at ${width}px`,
      ).toBe(true);
      await expect(page.locator('.money-ticker')).toBeVisible();
    }
    await addModal(page);
    expect(
      await page
        .locator('#expenseModal')
        .evaluate((element) => element.scrollWidth <= innerWidth),
      `Editor at ${width}px`,
    ).toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('live system theme changes update the palette without resetting the section, period or exclusions', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await launch(page);
  await openRows(page, [row(), row('ETF', -500, 'Investments', 'ETFs')]);
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page
    .locator('#analyticsExcludeCategory')
    .selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsAddExclusion').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(11, 12, 11)',
  );
  await expect(page.locator('#metricExpenses')).toHaveText('€1.00');
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('overall');
  await expect(page.locator('#analyticsExclusionsPanel')).toHaveAttribute(
    'open',
  );
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('#analytics-tab')).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('opening and closing a file start at the top even after scrolling the landing page or overview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await launch(page);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await expect(page.locator('#overview-tab-pane')).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: 'Close File', exact: true }).click();
  await expect(page.locator('#landingView')).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('Now fills the current local date and time without submitting the transaction', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, []);
  await addModal(page);
  await page.getByRole('button', { name: 'Now', exact: true }).click();
  await expect(page.locator('#inputDate')).toHaveValue('2026-11-18');
  await expect(page.locator('#inputTime')).toHaveValue(/^12:00:/);
  await expect(page.locator('#expenseModal')).toBeVisible();
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('unload warnings protect pending edits, but clean sessions and CSV downloads do not prompt', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row()]);
  const wouldWarn = () =>
    page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
  expect(await wouldWarn()).toBe(false);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-18, -5, Save test');
  await page
    .getByRole('button', { name: 'Save Transaction', exact: true })
    .click();
  expect(await wouldWarn()).toBe(true);
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  const download = page.waitForEvent('download');
  await page.locator('#btnSaveChanges').click();
  await (await download).path();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await page.locator('#btnConfirmDownload').click();
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
  expect(dialogs).toEqual([]);
  expect(await wouldWarn()).toBe(false);
});

test('LAN-compatible IDs support CSV import, manual and multiline entry, and download without randomUUID', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true }));
  await launch(page);
  await openRows(page, [row('Imported')]);
  await addModal(page);
  await page.locator('#inputDate').fill('2026-11-18');
  await page.locator('#inputAmount').fill('-2');
  await page.locator('#inputDescription').fill('Manual');
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-18, -3, Inline one\n2026-11-18, -4, Inline two');
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  const ids = await page.locator('#transactionsTbody .mobile-row-click').evaluateAll(rows => rows.map(row => row.dataset.id));
  expect(ids).toHaveLength(4);
  expect(new Set(ids).size).toBe(4);
  const download = page.waitForEvent('download');
  await page.locator('#btnSaveChanges').click();
  await (await download).path();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await page.locator('#btnConfirmDownload').click();
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('issue counts highlight problems and the cream logo returns to Overview without discarding edits', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Needs review', -1, 'Unknown', '')]);
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupIssueCount')).toHaveClass(/text-danger/);
  await expect(page.getByRole('heading', { name: 'Issues found', exact: true })).toHaveClass(/text-danger/);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-18, -1, Pending');
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await expect(page.locator('#overview-tab-pane')).toBeVisible();
  await expect(page.locator('#currentFileName')).toHaveText('test.csv');
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await page.locator('#btnCloseFile').click({ trial: true });

});

test('subcategory choices narrow by category and clearing the category restores all groups', async ({ page }) => {
  await launch(page); await openRows(page, []); await addModal(page);
  await expect(page.locator('#inputSubcategory optgroup')).toHaveCount(21);
  await page.locator('#inputCategory').selectOption('Travel');
  await expect(page.locator('#inputSubcategory optgroup')).toHaveCount(1);
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Travel', 'Transport']));
  await page.locator('#inputCategory').selectOption('');
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Income', 'Salary']));
  await expect(page.locator('#inputCategory')).toHaveValue('Income');
});

test('analytics clear filters restores the period and all exclusions', async ({ page }) => {
  await launch(page); await openRows(page, [row()]); await tab(page, 'Analytics');
  await expect(page.locator('#analyticsExclusionSummary')).toBeHidden();
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeAll').click();
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('last_12_months');
  await expect(page.locator('#metricExpenses')).toHaveText('€1.00');
  await expect(page.locator('#analyticsExclusionSummary')).toContainText('0 categories');
});

test('ledger filters compose with search, scope bulk selection and survive analytics drilldown round trips', async ({ page }) => {
  await launch(page); await openRows(page, [row('Coffee', -10), row('Pay', 100, 'Income', 'Salary'), row('Earlier coffee', -20, 'Bar', 'Coffee', '2026-10-01T12:00:00+02:00')]);
  await page.getByText('Transaction filters', { exact: true }).click();
  await page.locator('#filterCategory').selectOption(JSON.stringify('Bar'));
  await page.locator('#filter-from').fill('2026-11-01');
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(1);
  await page.locator('#btnSelectMode').click(); await page.locator('#selectAllCheckbox').check();
  await expect(page.locator('#selectedCount')).toHaveText('1');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.locator('#filterType').selectOption('income');
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(1);
  await tab(page, 'Analytics');
  await page.locator('#detailedCategoryList .category-header .btn-filter-tx').click();
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(2);
  await page.locator('#btnBackToAnalytics').click(); await tab(page, 'Transactions');
  await expect(page.locator('#filterType')).toHaveValue('income');
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(1);
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('transaction search uses one custom clear control without the native search cancel button', async ({ page }) => {
  await launch(page); await openRows(page, [row('Coffee'), row('Salary', 100, 'Income', 'Salary')]);
  const search = page.getByRole('searchbox', { name: 'Search transactions', exact: true });
  await expect(search).toHaveAttribute('type', 'text');
  await search.fill('Coffee');
  await expect(page.locator('#btnClearSearch')).toBeVisible();
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(1);
  await page.locator('#btnClearSearch').click();
  await expect(search).toHaveValue('');
  await expect(page.locator('#btnClearSearch')).toBeHidden();
  await expect(page.locator('#transactionsTbody .mobile-row-click')).toHaveCount(2);
});

test('working text is comfortably sized and the overview balance separates sign currency and value', async ({ page }) => {
  await launch(page); await openRows(page, [row('Legible coffee', -10)]);
  await expect(page.locator('.transaction-table')).toHaveCSS('font-size', '16px');
  await expect(page.locator('#inputSearchTransaction')).toHaveCSS('font-size', '17px');
  await expect(page.locator('#transactionsTbody')).toContainText('02-11-2026 14:28');
  await expect(page.locator('#transactionsTbody')).not.toContainText('14:28:36');
  await tab(page, 'Overview');
  const parts = page.locator('#overviewNet .money-amount > span');
  await expect(parts).toHaveText(['−', '€', '10.00']);
  const sign = await parts.nth(0).boundingBox(), currency = await parts.nth(1).boundingBox(), value = await parts.nth(2).boundingBox();
  expect(currency.x - (sign.x + sign.width)).toBeGreaterThan(3);
  expect(value.x - (currency.x + currency.width)).toBeGreaterThan(3);
  await expect(page.locator('#overview-tab-pane h1')).toHaveText('Overview');
  await expect(page.locator('#overview-tab-pane .page-description')).toHaveText('Income, spending and dataset health at a glance.');
  await page.setViewportSize({ width: 390, height: 844 });
  await tab(page, 'Transactions');
  await expect(page.locator('.mobile-visible .fw-bold.text-truncate')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.mobile-visible .text-muted.small').first()).toHaveCSS('font-size', '14px');
});

test('section and metric labels stay readable on desktop', async ({ page }) => {
  await launch(page); await openRows(page, [row()]);
  await tab(page, 'Overview');
  for (const selector of ['.net-hero .eyebrow', '.month-spotlight .eyebrow', '.flow-panel .eyebrow', '.net-details > div > span']) {
    await expect(page.locator(selector).first()).toHaveCSS('font-size', '14px');
  }
  await tab(page, 'Analytics');
  await expect(page.locator('.analytics-net .eyebrow')).toHaveCSS('font-size', '15px');
});

test('Dataset Health count stays inside narrow desktop navigation without clipping the label', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 125 }, (_, i) => row(`Review ${i}`, -1, '', '')));
  for (const width of [768, 991, 992, 1024, 1199, 1200, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await tab(page, 'Dataset Health');
    const badge = page.locator('#cleanup-tab .health-nav-count');
    await expect(badge).toHaveText('125');
    const badgeBox = await badge.boundingBox();
    for (const selector of ['#cleanup-tab', '.workspace-sidebar']) {
      const box = await page.locator(selector).boundingBox();
      expect(badgeBox.x, `${selector} left at ${width}`).toBeGreaterThanOrEqual(box.x);
      expect(badgeBox.x + badgeBox.width, `${selector} right at ${width}`).toBeLessThanOrEqual(box.x + box.width);
      expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(box.y + box.height);
    }
    if (width >= 992) {
      const label = page.locator('#cleanup-tab > span:not(.health-nav-count)');
      await expect(label).toBeVisible();
      expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      const labelBox = await label.boundingBox();
      expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(badgeBox.x);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('a narrow desktop can unlock, edit and relock without header overlaps', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 900 });
  await launch(page);
  await openRows(page, [row()]);
  await expect(page.locator('#btnToggleViewOnly')).toBeVisible();
  for (const width of [320, 500, 767]) {
    await page.setViewportSize({ width, height: 900 });
    const controls = ['.brand-lockup', '#btnToggleViewOnly', '#btnAddExpense'];
    const boxes = await Promise.all(controls.map(selector => page.locator(selector).boundingBox()));
    expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x);
    expect(boxes[1].x + boxes[1].width).toBeLessThanOrEqual(boxes[2].x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#btnToggleViewOnly').click();
    await expect(page.locator('#btnAddExpense')).toBeHidden();
    await expect(page.locator('#btnToggleViewOnly')).toBeVisible();
    await page.locator('#btnToggleViewOnly').click();
    await expect(page.locator('#btnAddExpense')).toBeVisible();
  }
  await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -2, Narrow desktop'); await saveModal(page);
  await expect(page.locator('#unsavedWarning')).toBeVisible();
});

test('workspace headings pair section names with one helpful subtitle', async ({ page }) => {
  await launch(page); await openRows(page, [row()]);
  for (const [name, id] of [['Overview','overview'], ['Transactions','list'], ['Analytics','analytics'], ['Dataset Health','cleanup']]) {
    await tab(page, name);
    await expect(page.locator(`#${id}-tab-pane h1`)).toHaveText(name);
    await expect(page.locator(`#${id}-tab-pane .page-heading .eyebrow`)).toHaveCount(0);
    const subtitle = page.locator(`#${id}-tab-pane .page-heading .page-description`);
    await expect(subtitle).toHaveCount(1);
    await expect(subtitle).toBeVisible();
    expect((await subtitle.textContent()).length).toBeLessThan(85);
  }
});

test('desktop Dataset Health card uses a prominent contained percentage graphic', async ({ page }) => {
  await launch(page); await openRows(page, [row('Clean'), row('Review', -1, '', '')]);
  await tab(page, 'Overview');
  for (const width of [1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    const panel = await page.locator('.health-spotlight').boundingBox();
    const ring = await page.locator('.health-ring').boundingBox();
    expect(ring.width).toBeGreaterThanOrEqual(160);
    expect(ring.width).toBeLessThanOrEqual(224);
    expect(ring.height / panel.height).toBeGreaterThan(.25);
    expect(ring.x).toBeGreaterThanOrEqual(panel.x);
    expect(ring.x + ring.width).toBeLessThanOrEqual(panel.x + panel.width);
    const caption = await page.locator('.health-ring-caption').boundingBox();
    expect(caption.y).toBeGreaterThanOrEqual(ring.y + ring.height);
  }
  await expect(page.locator('.health-spotlight h2')).toHaveText('Dataset health');
});

test('desktop navigation stays anchored and file status stays beside the filename', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 45 }, (_, i) => row(`Purchase ${i}`, -10)));
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const sidebar = page.locator('.workspace-sidebar');
    const before = await sidebar.boundingBox();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => (await sidebar.boundingBox()).y).toBe(before.y);
    expect(before.y + before.height).toBe(800);
    await expect(page.locator('.cream-footer')).toHaveCount(0);
    const name = await page.locator('#currentFileName').boundingBox();
    const status = await page.locator('.file-status').boundingBox();
    expect(Math.abs(status.y + status.height / 2 - name.y - name.height / 2)).toBeLessThan(2);
    expect(status.x).toBeGreaterThanOrEqual(name.x + name.width);
  }
});

test('welcome and demo guidance show a warning box without an orphan editor divider', async ({ page }) => {
  await launch(page);
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Take a look around/ }).click();
  const notice = page.locator('#demoNotice');
  await expect(notice).toHaveClass(/alert demo-notice/);
  await expect(notice).toHaveText('Demo session. Explore the sample dataset in read-only mode.');
  await page.locator('.recent-transaction').first().click();
  await expect(page.locator('#expenseForm hr')).toHaveCount(0);
  await expect(page.locator('#inlineInput')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('#btnToggleViewOnly').click();
  await page.locator('.recent-transaction').first().click();
  await expect(page.locator('#expenseForm hr')).toHaveCount(1);
  await expect(page.locator('#inlineInput')).toBeVisible();
});

test('landing places new-file and demo choices before the existing-file panel on phones and beside it on desktop', async ({ page }) => {
  await launch(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const story = await page.locator('.landing-story').boundingBox();
    const open = await page.locator('#dropZone').boundingBox();
    if (width >= 768) expect(story.x + story.width).toBeLessThanOrEqual(open.x);
    else expect(story.y + story.height).toBeLessThanOrEqual(open.y);
    await expect(page.locator('.landing-story #btnCreateNewFile')).toBeVisible();
    await expect(page.locator('.landing-demo-area .landing-demo')).toBeVisible();
    const demo = await page.locator('.landing-demo-area').boundingBox();
    const hero = await page.locator('.landing-hero').boundingBox();
    expect(demo.y).toBeGreaterThanOrEqual(hero.y + hero.height);
  }
});

test('analytics uses consistent headings and section colors with readable monthly comparison', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Investment', -1000, 'Investments', 'ETFs'), row('Salary', 2000, 'Income', 'Salary')]);
  await tab(page, 'Analytics');
  for (const width of [320, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await expect(page.locator('html')).toHaveAttribute('data-bs-theme', theme);
      const titles = page.locator('.analytics-chart .card-title, .analytics-breakdown .card-title');
      for (const title of await titles.all()) await expect(title).toHaveCSS('font-size', '22px');
      for (const kind of ['expenses', 'income']) {
        const section = page.locator(`.breakdown-${kind}`);
        const color = await section.locator('.card-title').evaluate(el => getComputedStyle(el).color);
        await expect(section.locator('.category-header .fw-bold').first()).toHaveCSS('color', color);
        await expect(section.locator('.category-amount-badge').first()).toHaveCSS('color', color);
      }
      await expect(page.locator('.analytics-comparison > div').first()).toHaveCSS('font-size', '15px');
      await expect(page.locator('#metricCurrentMonth')).toHaveCSS('font-size', '23px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('sort stays visible and readable while breakdown bars and expansion controls follow their sections', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 7 }, (_, i) => [row(`Expense ${i}`, -10, `Expense category ${i}`), row(`Income ${i}`, 20, `Income category ${i}`)]).flat());
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await tab(page, 'Transactions');
    const sort = page.locator('#transactionSort');
    await expect(sort).toBeVisible();
    await expect(sort).toHaveCSS('font-size', '16px');
    await expect(page.locator('label[for="transactionSort"]')).toHaveCSS('font-size', '16px');
    await sort.selectOption('Amount:desc');
    await expect(sort).toHaveValue('Amount:desc');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tab(page, 'Analytics');
    for (const kind of ['expenses', 'income']) {
      const section = page.locator(`.breakdown-${kind}`);
      const titleColor = await section.locator('.card-title').evaluate(el => getComputedStyle(el).color);
      await expect(section.locator('.category-progress-bar').first()).toHaveCSS('background-color', titleColor);
      const more = section.getByRole('button', { name: /Show More/ });
      await expect(more).toHaveCSS('font-size', '16px');
      await more.click();
      await expect(section.locator('.category-item')).toHaveCount(7);
      const less = section.getByRole('button', { name: /Show Less/ });
      await expect(less).toHaveCSS('font-size', '16px');
      await less.click();
      await expect(section.locator('.category-item')).toHaveCount(5);
    }
  }
});

test('supporting text and tag bars remain readable in light and dark themes', async ({ page }, testInfo) => {
  await launch(page);
  await openRows(page, [{ ...row('Tagged purchase', -10), Tags: 'work' }, row('Missing category', -2, '', '')]);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await expect(page.locator('html')).toHaveAttribute('data-bs-theme', theme);
      await tab(page, 'Analytics');
      const title = page.locator('.breakdown-tags .card-title');
      const blue = await title.evaluate(el => getComputedStyle(el).color);
      await expect(page.locator('.breakdown-tags .category-progress-bar').first()).toHaveCSS('background-color', blue);
      await page.locator('#analyticsExclusionsPanel > summary').click();
      await expect(page.locator('#analyticsExclusionsPanel > summary')).toHaveCSS('font-size', '16px');
      await expect(page.locator('#analyticsExclusionSummary')).toHaveCSS('font-size', '14px');
      await page.locator('#analyticsExclusionsPanel > summary').click();
      await tab(page, 'Dataset Health');
      await expect(page.locator('#cleanupRecords h6').first()).toHaveCSS('font-size', '16px');
      await page.getByRole('button', { name: 'Review / Edit transaction 2', exact: true }).click();
      const warning = page.locator('#transactionHealthIssues');
      await expect(warning).toBeVisible();
      await expect(warning).toHaveCSS('font-size', '16px');
      await expect(page.locator('#inlineInput')).toHaveCSS('font-size', '16px');
      await expect(page.locator('label[for="inputDescription"]')).toHaveCSS('font-size', '16px');
      await expect(page.locator('#expenseModal .form-text').first()).toHaveCSS('font-size', '15px');
      const contrast = await warning.evaluate(el => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const luminance = color => {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
            const n = value / 255;
            return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
          });
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        };
        const style = getComputedStyle(el), text = luminance(style.color), background = luminance(style.backgroundColor);
        return (Math.max(text, background) + .05) / (Math.min(text, background) + .05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      if (width === 320) await page.screenshot({ path: testInfo.outputPath(`editor-${theme}.png`) });
      expect(await page.locator('#expenseModal').evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press('Escape');
      for (const section of ['Overview', 'Transactions', 'Analytics', 'Dataset Health']) {
        await tab(page, section);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  }
});

test('result count sits above the ledger and exclusions precede the plain period row', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Coffee'), row('Second', -5)]);
  for (const width of [320, 768, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await tab(page, 'Transactions');
    const search = await page.locator('.ledger-search').boundingBox();
    const count = await page.locator('#transactionResultCount').boundingBox();
    expect(count.y).toBeGreaterThanOrEqual(search.y + search.height);
    expect(count.x).toBe(search.x);
    const table = await page.locator('#transactionsTable').boundingBox();
    expect(table.y - count.y - count.height).toBeLessThanOrEqual(12);
    if (width < 768) {
      const sort = await page.locator('.ledger-sort').boundingBox();
      expect(count.y).toBeGreaterThanOrEqual(sort.y + sort.height);
      expect(sort.x).toBe(search.x);
    }
    await tab(page, 'Analytics');
    await expect(page.locator('.analytics-reset-actions #clearAnalyticsFilters')).toBeVisible();
    await expect(page.locator('.page-heading #clearAnalyticsFilters')).toHaveCount(0);
    await page.locator('#analyticsTimePeriod').selectOption('current_month');
    await page.locator('#clearAnalyticsFilters').click();
    await expect(page.locator('#analyticsTimePeriod')).toHaveValue('last_12_months');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('cash flow fills its analytics card and period shares a plain row with reset below exclusions', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 5 }, (_, i) => row(`Expense ${i}`, -10, `Category ${i}`)));
  await tab(page, 'Analytics');
  for (const width of [320, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const reset = page.getByRole('button', { name: 'Clear filters', exact: true });
    const clear = await reset.boundingBox();
    const period = await page.locator('.analytics-toolbar').boundingBox();
    const exclusions = await page.locator('#analyticsExclusionsPanel').boundingBox();
    const fields = await page.locator('.analytics-period-controls').boundingBox();
    if (width >= 768) expect(Math.abs(clear.y + clear.height / 2 - fields.y - fields.height / 2)).toBeLessThan(2);
    else expect(clear.y).toBeGreaterThanOrEqual(fields.y + fields.height);
    expect(period.y).toBeGreaterThanOrEqual(exclusions.y + exclusions.height);
    await expect(page.locator('.analytics-toolbar')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const label = await page.locator('label[for="analyticsTimePeriod"]').boundingBox();
    const select = await page.locator('#analyticsTimePeriod').boundingBox();
    expect(select.x).toBeGreaterThanOrEqual(label.x + label.width);
    expect(Math.abs(select.y + select.height / 2 - label.y - label.height / 2)).toBeLessThan(2);
    expect(clear.y).toBeGreaterThanOrEqual(exclusions.y + exclusions.height);
    await expect.poll(async () => page.locator('.chart-card-line').evaluate(card => {
      const body = card.querySelector('.card-body');
      const chart = card.querySelector('.shared-chart');
      const style = getComputedStyle(body);
      return Math.abs(chart.getBoundingClientRect().height - body.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
    })).toBeLessThan(2);
    await expect(page.locator('#cashFlowLineChart')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
