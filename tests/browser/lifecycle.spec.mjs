import {
  test,
  expect,
  launch,
  openRows,
  row,
  tab,
  addModal,
  saveModal,
  downloadRows,
} from './fixtures.mjs';

test('modal cleanup restores focus and scrolling; reopening starts with an empty draft', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row()]);
  for (let index = 0; index < 3; index++) {
    await addModal(page);
    await page.locator('#inputDescription').fill(`Unsaved draft ${index}`);
    await page.keyboard.press('Escape');
    await expect(page.locator('#expenseModal')).toBeHidden();
    await expect(page.locator('#btnAddExpense')).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/modal-open/);
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  }
  await addModal(page);
  await expect(page.locator('#inputDescription')).toHaveValue('');
  await expect(page.locator('#inlineInput')).toHaveValue('');
  await expect(page.locator('#inputSubcategory')).toBeEnabled();
  await page
    .locator('#inputSubcategory')
    .selectOption(JSON.stringify(['Bills', 'Subscriptions']));
  await expect(page.locator('#inputCategory')).toHaveValue('Bills');
  await page.locator('#inputDate').fill('2026-11-03');
  await page.locator('#inputAmount').fill('-5');
  await page.locator('#inputDescription').fill('One submission');
  await saveModal(page);
  expect((await downloadRows(page)).rows).toHaveLength(2);
});

test('switching files resets local UI and exclusion state and does not retain hidden listeners', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [row(), row('ETF', -500, 'Investments', 'ETFs')]);
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeAll').click();
  await expect(page.locator('#metricExpenses')).toHaveText('€0.00');
  await page.getByRole('button', { name: 'Close File', exact: true }).click();
  await openRows(page, [row('New file only', -7)]);
  await tab(page, 'Analytics');
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue(
    'last_12_months',
  );
  await expect(page.locator('#analyticsExclusionsPanel')).not.toHaveAttribute(
    'open',
  );
  await expect(page.locator('#analyticsExclusionSummary')).toContainText(
    '0 categories, 0 subcategories, 0 individual selections',
  );
  await expect(page.locator('#metricExpenses')).toHaveText('€7.00');
  await tab(page, 'Transactions');
  await expect(page.locator('#btnBackToAnalytics')).toBeHidden();
  await expect(page.locator('#inputSearchTransaction')).toHaveValue('');
  await expect(
    page.locator('#transactionsTbody .mobile-row-click'),
  ).toHaveCount(1);
});

test('system theme follows changes and charts resize after hidden tabs become visible', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await launch(page);
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await openRows(page, [row()]);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');
  for (let index = 0; index < 3; index++) {
    await tab(page, 'Analytics');
    await expect(page.locator('#categoryPieChart')).toBeVisible();
    await expect
      .poll(() =>
        page.locator('#categoryPieChart').evaluate((canvas) => canvas.width),
      )
      .toBeGreaterThan(100);
    await expect
      .poll(() =>
        page.locator('#cashFlowLineChart').evaluate((canvas) => canvas.width),
      )
      .toBeGreaterThan(100);
    await expect
      .poll(async () => {
        const box = await page.locator('#categoryPieChart').boundingBox();
        return box ? Math.abs(box.width / box.height - 2) : Infinity;
      })
      .toBeLessThan(0.02);
    await tab(page, 'Transactions');
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
});

test('imported descriptions and notes render as text rather than HTML', async ({
  page,
}) => {
  await launch(page);
  await openRows(page, [
    {
      ...row('<img src=x onerror="window.injected=true">'),
      Notes: '<script>window.injected=true</script>',
    },
  ]);
  await expect(page.locator('#transactionsTbody')).toContainText(
    '<img src=x onerror="window.injected=true">',
  );
  await expect(page.locator('#transactionsTbody img')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});
