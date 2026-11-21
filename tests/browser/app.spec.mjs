import { test, expect, row, launch, openRows, openRawCSV, tab, addModal, saveModal, downloadRows, headers, unlockFile } from './fixtures.mjs';
import Papa from 'papaparse';

test('create a file, enter a transaction, save and reopen the downloaded CSV', async ({ page }) => {
  await launch(page);
  page.once('dialog', dialog => dialog.accept('new.csv'));
  await page.getByRole('button', { name: 'Create New File', exact: true }).click();
  await addModal(page);
  await page.locator('#inputDate').fill('2026-11-02');
  await page.locator('#inputAmount').fill('-2.50');
  await page.locator('#inputDescription').fill('Caffè ☕');
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Bar', 'Coffee']));
  await expect(page.locator('#inputCategory')).toHaveValue('Bar');
  await page.locator('#inputNotes').fill('First line\nSecond, "quoted"');
  await saveModal(page);
  const saved = await downloadRows(page);
  expect(saved.rows[0]).toMatchObject({ Description: 'Caffè ☕', Amount: '-2.5', Category: 'Bar', Subcategory: 'Coffee', Notes: 'First line\nSecond, "quoted"' });
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
  await page.getByRole('button', { name: 'Close File', exact: true }).click();
  await openRawCSV(page, saved.text, 'reopened.csv');
  await expect(page.locator('#transactionsTbody')).toContainText('Caffè ☕');
});

test('edit and delete a transaction, cancel deletion, then undo', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Original')]);
  await page.locator('.btn-edit').click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await page.locator('#inputDescription').fill('Changed');
  await page.locator('#inputCategory').selectOption('Income');
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Income', 'Salary']));
  await expect(page.locator('#inputCategory')).toHaveValue('Income');
  await saveModal(page);
  await expect(page.locator('#transactionsTbody')).toContainText('Changed');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('.btn-del').click();
  await expect(page.locator('.btn-edit')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.btn-del').click();
  await expect(page.locator('.btn-edit')).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Undo Changes', exact: true }).click();
  await expect(page.locator('#transactionsTbody')).toContainText('Original');
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('single and multiline quick input handle quoted text, classifications and warnings', async ({ page }) => {
  await launch(page);
  await openRows(page, []);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-02T14:28:36+01:00, €-1, "Coffee, cake", Bar, Coffee');
  await expect(page.locator('#inputDescription')).toHaveValue('Coffee, cake');
  await saveModal(page);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-03, -5, Legacy format\n2026-11-04, -2, Unknown category, Wrong Category, Coffee\n2026-11-05, 30, Work, Income, Freelance');
  await expect(page.locator('#inlineInputFeedback')).toContainText('will not be saved');
  await saveModal(page);
  await expect(page.locator('.btn-edit')).toHaveCount(4);
  await expect(page.locator('#inlineImportNotice')).toContainText('Wrong Category');
  const { rows } = await downloadRows(page);
  expect(rows.find(r => r.Description === 'Unknown category').Category).toBe('');
  expect(rows.find(r => r.Description === 'Work').Subcategory).toBe('Freelance');
});

test('invalid inline batches are atomic and do not insert the valid first row', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Keep')]);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-02, -1, Valid\n2026-02-30, -2, Invalid');
  await page.getByRole('button', { name: 'Save Transaction', exact: true }).click();
  await expect(page.locator('#inlineInputFeedback')).toContainText('Line 2');
  await expect(page.locator('#expenseModal')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.btn-edit')).toHaveCount(1);
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});

test('bulk subcategory, category, tags and delete affect only selected records', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('First'), row('Second'), row('Untouched')]);
  async function selectTwo() {
    await page.locator('#btnSelectMode').click();
    await page.locator('.transaction-checkbox').nth(0).check();
    await page.locator('.transaction-checkbox').nth(1).check();
  }
  await selectTwo();
  await page.locator('#bulkSubcategorySelect').selectOption('Bills|Subscriptions');
  page.once('dialog', d => d.accept());
  await page.locator('#btnBulkApplySubcategory').click();
  await selectTwo();
  await page.locator('#bulkCategorySelect').selectOption('Tools');
  page.once('dialog', d => d.accept());
  await page.locator('#btnBulkApplyCategory').click();
  await selectTwo();
  await page.locator('#bulkTagsInput').fill('work, #monthly #work');
  page.once('dialog', d => d.accept());
  await page.locator('#btnBulkApplyTags').click();
  const { rows } = await downloadRows(page);
  expect(rows.filter(r => r.Category === 'Tools')).toHaveLength(2);
  expect(rows.filter(r => r.Category === 'Tools').every(r => r.Subcategory === '')).toBe(true);
  expect(rows.filter(r => r.Tags.includes('#work'))).toHaveLength(2);
  expect(rows.find(r => r.Description === 'Untouched').Category).toBe('Bar');
  await selectTwo();
  page.once('dialog', d => d.accept());
  await page.locator('#btnBulkDelete').click();
  await expect(page.locator('.btn-edit')).toHaveCount(1);
});

test('search and numerical sorting produce the expected records', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Cheap', -2), row('Large', -100), row('Salary', 50, 'Income', 'Salary')]);
  await page.locator('#inputSearchTransaction').fill('Income');
  await expect(page.locator('.btn-edit')).toHaveCount(1);
  await page.locator('#btnClearSearch').click();
  await page.locator('th[data-sort="Amount"]').click();
  await expect(page.locator('#transactionsTbody .mobile-row-click').first()).toContainText('Salary');
  await page.locator('th[data-sort="Amount"]').click();
  await expect(page.locator('#transactionsTbody .mobile-row-click').first()).toContainText('Large');
});

test('Dataset Health repairs invalid source values and undo restores the report', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Broken', '12oops', 'Legacy', 'Wrong', '2026-02-30T10:00:00+01:00')]);
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupDirty')).toHaveText('1');
  await expect(page.locator('#cleanupIssueCount')).toHaveText('2');
  await page.getByRole('button', { name: 'Review / Edit transaction 1', exact: true }).click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#transactionHealthIssues')).toContainText('12oops');
  await page.locator('#inputDate').fill('2026-11-02');
  await page.locator('#inputAmount').fill('-12');
  await page.locator('#inputCategory').selectOption('Bar');
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Bar', 'Coffee']));
  await saveModal(page);
  await expect(page.locator('#cleanupDirty')).toHaveText('0');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Undo Changes', exact: true }).click();
  await expect(page.locator('#cleanupDirty')).toHaveText('1');
});

test('exclusions, Exclude all, dropdown deduplication and reinclusion update every view', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Coffee', -10), row('ETF', -500, 'Investments', 'ETFs'), row('Dividend', 20, 'Investments', 'Interests & Dividends')]);
  await tab(page, 'Analytics');
  await expect(page.locator('#metricExpenses')).toHaveText('€510.00');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsExcludeSubcategory').selectOption(JSON.stringify('ETFs'));
  await page.locator('#analyticsAddExclusion').click();
  await expect(page.locator('#metricExpenses')).toHaveText('€10.00');
  await expect(page.locator('#metricIncome')).toHaveText('€20.00');
  await expect(page.locator('#analyticsExcludeSubcategory option')).toHaveText(['Entire category', 'Interests & Dividends']);
  await page.locator('#analyticsExcludeAll').click();
  await expect(page.locator('#metricIncome')).toHaveText('€0.00');
  await expect(page.locator('#analyticsExcludeCategory')).toBeDisabled();
  await page.getByRole('button', { name: 'Remove exclusion: Bar', exact: true }).click();
  await expect(page.locator('#metricExpenses')).toHaveText('€10.00');
  await page.locator('#analyticsIncludeAll').click();
  await expect(page.locator('#metricExpenses')).toHaveText('€510.00');
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
  await tab(page, 'Transactions');
  await expect(page.locator('.btn-edit')).toHaveCount(3);
});

test('individual exclusions and empty periods are reversible', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('One', -10), row('Two', -20)]);
  await tab(page, 'Analytics');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.getByText('Exclude individual transactions', { exact: true }).click();
  await page.locator('#analyticsExclusionSearch').fill('One');
  await page.getByRole('checkbox', { name: /Exclude transaction: One/ }).check();
  await expect(page.locator('#metricExpenses')).toHaveText('€20.00');
  await page.getByRole('checkbox', { name: /Exclude transaction: One/ }).uncheck();
  await expect(page.locator('#metricExpenses')).toHaveText('€30.00');
  await page.locator('#analyticsTimePeriod').selectOption('specific_month');
  await expect(page.locator('#analyticsSpecificMonth')).toHaveValue('2026-11');
  await page.locator('#analyticsExcludeAll').click();
  await expect(page.locator('#analyticsNoData')).toBeVisible();
});

test('View Transactions and Back preserve exclusions, period, expansions and original search', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Coffee', -10), row('ETF', -500, 'Investments', 'ETFs')]);
  await page.locator('#inputSearchTransaction').fill('ETF');
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('specific_month');
  await page.getByText('Analytics exclusions', { exact: true }).click();
  await page.locator('#analyticsExcludeCategory').selectOption(JSON.stringify('Investments'));
  await page.locator('#analyticsAddExclusion').click();
  await page.locator('#detailedCategoryList .category-header').click();
  await page.locator('#detailedCategoryList .category-header .btn-filter-tx').click();
  await expect(page.locator('#btnBackToAnalytics')).toBeVisible();
  await expect(page.locator('#inputSearchTransaction')).toHaveValue('');
  await expect(page.locator('#list-tab-pane .scope-note')).toContainText('Bar');
  await page.locator('#btnBackToAnalytics').click();
  await expect(page.locator('#analytics-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#inputSearchTransaction')).toHaveValue('ETF');
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('specific_month');
  await expect(page.locator('#analyticsExclusionSummary')).toContainText('1 category');
  await expect(page.locator('#detailedCategoryList .category-item')).toHaveClass(/expanded/);
});

test('malformed CSV is rejected and view-only mode prevents editing', async ({ page }) => {
  await launch(page);
  const dialogPromise = page.waitForEvent('dialog');
  const upload = openRawCSV(page, 'wrong,header\n1,2', 'invalid.csv', { valid: false });
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Incompatible');
  await dialog.accept();
  await upload;
  await expect(page.locator('#landingView')).toBeVisible();
  await openRows(page, [row()]);
  await page.locator('#btnToggleViewOnly').click();
  await expect(page.locator('#btnAddExpense')).toBeHidden();
  await page.locator('#transactionsTbody .mobile-row-click').click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#inputDescription')).toBeDisabled();
  await expect(page.locator('#btnSaveTransaction')).toBeHidden();
});

test('native file-save failure keeps the edit pending and baseline unchanged', async ({ page }) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = () => {};
    window.showOpenFilePicker = async () => [{ name: 'native.csv',
      getFile: async () => new File(['DateTime,Amount,Description,Category,Subcategory,Tags,Notes\n2026-11-02T12:00:00+01:00,-1,Native,Bar,Coffee,,'], 'native.csv'),
      createWritable: async () => { throw new DOMException('Denied', 'NotAllowedError'); }
    }];
  });
  await launch(page);
  await page.getByRole('button', { name: 'Browse Files', exact: true }).click();
  await expect(page.locator('#currentFileName')).toHaveText('native.csv');
  await unlockFile(page);
  await tab(page, 'Transactions');
  await expect(page.locator('.btn-edit')).toHaveCount(1);
  await page.locator('.btn-edit').click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await page.locator('#inputDescription').fill('Pending');
  await saveModal(page);
  page.once('dialog', d => d.accept());
  await page.locator('#btnSaveChanges').click();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await expect(page.locator('#btnSaveChanges')).toBeEnabled();
  page.once('dialog', d => d.accept());
  await page.locator('#btnUndoChanges').click();
  await expect(page.locator('#transactionsTbody')).toContainText('Native');
});

test('download of unchanged imported fields preserves full timestamps and multiline values', async ({ page }) => {
  await launch(page);
  const source = { ...row('Caffè, "speciale"', -1, 'Bar', 'Coffee', '2026-11-02T09:00:00.123Z'), Notes: 'Line 1\nLine 2, "quoted"' };
  await openRows(page, [source]);
  await page.locator('.btn-edit').click();
  await expect(page.locator('#expenseModal')).toHaveCSS('opacity', '1');
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Bar', 'Snack']));
  await saveModal(page);
  const saved = await downloadRows(page);
  expect(saved.rows[0]).toMatchObject({ ...source, Amount: '-1', Subcategory: 'Snack' });
});

test('drag/drop imports a real File and refuses to discard pending changes when cancelled', async ({ page }) => {
  await launch(page);
  async function drop(description) {
    const text = Papa.unparse([row(description)], { columns: headers });
    const transfer = await page.evaluateHandle(text => {
      const data = new DataTransfer();
      data.items.add(new File([text], 'dropped.csv', { type: 'text/csv' }));
      return data;
    }, text);
    await page.locator('body').dispatchEvent('drop', { dataTransfer: transfer });
    await transfer.dispose();
  }
  await drop('Dropped');
  await expect(page.locator('#transactionsTbody')).toContainText('Dropped');
  await unlockFile(page);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-03, -1, Pending');
  await saveModal(page);
  page.once('dialog', d => d.dismiss());
  await drop('Replacement');
  await expect(page.locator('.btn-edit')).toHaveCount(2);
  await expect(page.locator('#transactionsTbody')).not.toContainText('Replacement');
  await expect(page.locator('#unsavedWarning')).toBeVisible();
});

test('health pagination and issue filtering keep all records available', async ({ page }) => {
  await launch(page);
  await openRows(page, Array.from({ length: 55 }, (_, i) => row(`Review ${i}`, -1, i < 2 ? 'bar' : 'Bar', '')));
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupRecords article')).toHaveCount(50);
  await page.locator('#cleanupShowMore').click();
  await expect(page.locator('#cleanupRecords article')).toHaveCount(55);
  await page.locator('#cleanupFilter').selectOption('similar_classification');
  await expect(page.locator('#cleanupRecords article')).toHaveCount(2);
  await expect(page.locator('#cleanupDirty')).toHaveText('55');
});

test('date sorting respects actual instants rather than the text of timezone offsets', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Earlier', -1, 'Bar', 'Coffee', '2026-11-02T10:00:00+02:00'),
    row('Later', -1, 'Bar', 'Coffee', '2026-11-02T09:00:00Z')]);
  await expect(page.locator('#transactionsTbody .mobile-row-click').first()).toContainText('Later');
});

test('multiline input never inherits classifications from other rows or the form', async ({ page }) => {
  await launch(page);
  await openRows(page, []);
  const classified = '2026-11-20T20:11:11+01:00, €-7.5, Pizza da Fede, Food & Dining, Restaurant';
  const plain = '2026-11-21T10:29:42+01:00, €10, Test';
  const batches = [
    [classified, plain, '2026-11-21, -1, Category only, Bar', '2026-11-21, -2, Explicit empty, ,', '2026-11-21, -3, Unknown, Not A Category, Coffee'],
    [plain.replace(', Test', ', Plain first'), classified.replace('Pizza da Fede', 'Classified second')],
  ];
  for (const batch of batches) {
    await addModal(page);
    await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Tools', 'Software & Licenses']));
    await page.locator('#inputNotes').fill('Shared note');
    await page.locator('#inlineInput').fill(batch.join('\n'));
    await saveModal(page);
  }
  const { rows } = await downloadRows(page);
  const find = description => rows.find(row => row.Description === description);
  expect(find('Pizza da Fede')).toMatchObject({ Category: 'Food & Dining', Subcategory: 'Restaurant', DateTime: '2026-11-20T20:11:11+01:00', Amount: '-7.5' });
  expect(find('Test')).toMatchObject({ Category: 'Uncategorized', Subcategory: '', DateTime: '2026-11-21T10:29:42+01:00', Amount: '10' });
  expect(find('Category only')).toMatchObject({ Category: 'Bar', Subcategory: '' });
  expect(find('Explicit empty')).toMatchObject({ Category: '', Subcategory: '' });
  expect(find('Unknown')).toMatchObject({ Category: '', Subcategory: '' });
  expect(find('Plain first')).toMatchObject({ Category: 'Uncategorized', Subcategory: '' });
  expect(find('Classified second')).toMatchObject({ Category: 'Food & Dining', Subcategory: 'Restaurant' });
  expect(rows).toHaveLength(7);
  expect(rows.every(row => row.Notes === 'Shared note')).toBe(true);
});
