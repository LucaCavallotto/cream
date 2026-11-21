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
  await page.getByText('Exclude categories', { exact: true }).click();
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

test('public assets retain their runtime URLs in production and development', async ({ page }) => {
  await launch(page);
  const [manifestResponse, catalogResponse, demoResponse] = await Promise.all([
    page.request.get('manifest.json'),
    page.request.get('data/categories.json'),
    page.request.get('demo.csv'),
  ]);
  for (const response of [manifestResponse, catalogResponse, demoResponse]) expect(response.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('cream');
  expect(manifest.start_url).toBe('./index.html');
  expect((await catalogResponse.json())['Food & Dining']).toContain('Restaurant');
  expect(await demoResponse.text()).toMatch(/^DateTime,Amount,Description,Category,Subcategory,Tags,Notes/);
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await expect(page.locator('#currentFileName')).toHaveText('demo.csv');
  await expect(page.locator('#overview-tab-pane')).toBeVisible();
  await expect(page.locator('#demoNotice')).toBeVisible();
});

test('development refresh keeps the root and open file usable after the footer removal', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.endsWith('-dev'), 'Fast Refresh is available only on the Vite development server.');
  await launch(page);
  await openRows(page, [row('Refresh record', -10)]);
  // Re-evaluate the real boundary through Vite, without editing repository files.
  for (let revision = 0; revision < 2; revision++) {
    await page.evaluate(async (revision) => {
      const runtime = await import('/@react-refresh');
      const previous = await import('/src/App.jsx');
      const next = await import(`/src/App.jsx?refresh-regression=${revision}`);
      await new Promise((resolve, reject) => {
        window.__registerBeforePerformReactRefresh(resolve);
        const reason = runtime.validateRefreshBoundaryAndEnqueueUpdate('/src/App.jsx', previous, next);
        if (reason) reject(new Error(reason));
      });
    }, revision);
    await expect(page.locator('#currentFileName')).toHaveText('test.csv');
    await expect(page.locator('.cream-footer')).toHaveCount(0);
    await tab(page, 'Overview');
    await tab(page, 'Transactions');
  }
  await page.locator('#transactionsTbody .mobile-row-click').first().click();
  await expect(page.locator('#inputDescription')).toHaveValue('Refresh record');
  await page.keyboard.press('Escape');
});
