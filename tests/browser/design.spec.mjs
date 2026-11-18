import {
  test,
  expect,
  launch,
  openRows,
  row,
  tab,
  addModal,
} from './fixtures.mjs';

test('cream opens the bundled demo in Overview and the shortcuts reach real data and records', async ({
  page,
}) => {
  await launch(page);
  await expect(page).toHaveTitle('cream — A clearer view of your money.');
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
  await download;
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
  await download;
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('issue counts highlight problems and the cream logo returns home without discarding edits silently', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Needs review', -1, 'Unknown', '')]);
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupIssueCount')).toHaveClass(/text-danger/);
  await expect(page.getByRole('heading', { name: 'Issues found', exact: true })).toHaveClass(/text-danger/);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-18, -1, Pending');
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await expect(page.locator('#appView')).toBeVisible();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await expect(page.locator('#landingView')).toBeVisible();
});
