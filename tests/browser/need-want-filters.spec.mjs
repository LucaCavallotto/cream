import { test, expect, launch, openRows, row, tab, downloadRows } from './fixtures.mjs';

test('Need/Want filters combine with search and allow bulk classification of matching legacy records', async ({page}) => {
  await launch(page);
  await openRows(page,[row('Old coffee',-5),row('Old lunch',-10,'Food & Dining','Restaurant'),{...row('Necessary',-20),NeedWant:'need'},{...row('Treat',-30),NeedWant:'want'}]);
  await page.getByText('Transaction filters',{exact:true}).click();
  const filters=page.locator('.transaction-filters');
  await page.locator('#filterNeedWant').selectOption('need');
  await expect(page.locator('#transactionResultCount')).toHaveText('1 transaction');
  await expect(page.locator('#transactionsTbody')).toContainText('Necessary');
  await page.locator('#filterNeedWant').selectOption('want');
  await expect(page.locator('#transactionsTbody')).toContainText('Treat');
  await page.locator('#filterNeedWant').selectOption('unclassified');
  await expect(page.locator('#transactionResultCount')).toHaveText('2 transactions');
  await page.locator('#inputSearchTransaction').fill('coffee');
  await expect(page.locator('#transactionResultCount')).toHaveText('1 transaction');
  await page.locator('#filterType').selectOption('income');
  await expect(page.locator('#transactionResultCount')).toHaveText('0 transactions');
  await page.locator('#filterType').selectOption('expense');
  await page.locator('#btnSelectMode').click();
  await page.locator('#selectAllCheckbox').check();
  await page.locator('#bulkNeedWant').selectOption('need');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#btnBulkApplyNeedWant').click();
  await expect(page.locator('#transactionResultCount')).toHaveText('0 transactions');
  await tab(page,'Overview');
  await tab(page,'Transactions');
  await expect(page.locator('#filterNeedWant')).toHaveValue('unclassified');
  await filters.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(page.locator('#filterNeedWant')).toHaveValue('');
  await expect(page.locator('#transactionResultCount')).toHaveText('4 transactions');
  const saved=await downloadRows(page);
  expect(saved.rows.find(r=>r.Description==='Old coffee').NeedWant).toBe('need');
  expect(saved.rows.find(r=>r.Description==='Old lunch').NeedWant).toBe('');
  expect(saved.rows.find(r=>r.Description==='Treat').NeedWant).toBe('want');
});

test('legacy records and unbounded date filters stay clear across widths and themes', async ({page},info) => {
  const {openRawCSV}=await import('./fixtures.mjs');
  await launch(page);
  await openRawCSV(page,'DateTime,Amount,Description,Category,Subcategory,Tags,Notes\n2026-11-02,-5,Earlier,Bar,Coffee,,\n2026-11-04,-10,Later,Bar,Coffee,,','legacy.csv',{editable:false});
  await tab(page,'Transactions');
  await page.getByText('Transaction filters',{exact:true}).click();
  for (const colorScheme of ['light','dark']) {
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
    for (const width of [320,1280]) {
      await page.setViewportSize({width,height:900});
      await page.locator('#filterNeedWant').selectOption('unclassified');
      await expect(page.locator('#transactionResultCount')).toHaveText('2 transactions');
      await expect(page.locator('.filter-date-placeholder')).toHaveText(['Any date','Any date']);
      await expect(page.locator('.filter-date-placeholder').first()).toBeVisible();
      await page.locator('#filter-from').fill('2026-11-03');
      await page.locator('#filter-to').fill('2026-11-05');
      await page.locator('#filterNeedWant').focus();
      await expect(page.locator('#transactionResultCount')).toHaveText('1 transaction');
      await expect(page.locator('.filter-date-placeholder')).toHaveCount(0);
      await page.locator('.transaction-filters').getByRole('button',{name:'Clear',exact:true}).click();
      await expect(page.locator('#filter-from')).toHaveValue('');
      await expect(page.locator('#filter-to')).toHaveValue('');
      await expect(page.locator('#filterNeedWant')).toHaveValue('');
      await expect(page.locator('#transactionResultCount')).toHaveText('2 transactions');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(width===320 && colorScheme==='dark') await page.screenshot({path:info.outputPath('empty-date-dark.png'),fullPage:true,scale:'css'});
    }
  }
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});
