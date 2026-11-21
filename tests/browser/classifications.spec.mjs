import { test, expect, launch, openRows, row, tab, saveModal } from './fixtures.mjs';

test('custom catalog, unclassified editing and duplicate prevention work together', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Crafts', -20, 'Hobbies', 'Painting'), row('Unclassified', -2, 'Uncategorized', '')]);
  await tab(page, 'Dataset Health');
  await page.locator('.health-explainer summary').click();
  await expect(page.locator('#customClassifications')).toContainText('Hobbies → Painting');
  await expect(page.locator('#cleanupDirty')).toHaveText('1');
  await page.getByRole('button', { name: 'Review / Edit transaction 2', exact: true }).click();
  expect(await page.locator('#inputSubcategory optgroup').count()).toBeGreaterThan(10);
  await page.locator('#inputSubcategory').selectOption(JSON.stringify(['Income', 'Sales']));
  await expect(page.locator('#inputCategory')).toHaveValue('Income');
  await page.getByRole('button', { name: 'Add category', exact: true }).click();
  await page.locator('#newClassification').fill(' hobbies ');
  await page.locator('.classification-create').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.classification-create [role=alert]')).toContainText('already exists');
  await page.locator('#newClassification').fill('Projects');
  await page.locator('.classification-create').getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add subcategory', exact: true }).click();
  await page.locator('#newClassification').fill('Hardware');
  await page.locator('.classification-create').getByRole('button', { name: 'Add', exact: true }).click();
  await saveModal(page);
  await expect(page.locator('#cleanupDirty')).toHaveText('0');
  await expect(page.locator('#customClassifications')).toContainText('Projects → Hardware');
});

test('possible duplicate names remain unchanged and their review suggestion follows into the editor', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Spelling review', -1, 'bar', 'Coffee')]);
  await tab(page, 'Dataset Health');
  await expect(page.locator('#cleanupRecords')).toContainText('Possible duplicate of “Bar”');
  await page.getByRole('button', { name: 'Review / Edit transaction 1', exact: true }).click();
  await expect(page.locator('#transactionHealthIssues')).toContainText('Possible duplicate of “Bar”');
  await expect(page.locator('#inputCategory')).toHaveValue('bar');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#btnSaveChanges')).toBeDisabled();
});
