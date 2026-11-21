import { test, expect, launch, openRawCSV, tab, saveModal } from './fixtures.mjs';

test('built-in demo is permanently read only and a personal demo.csv remains editable', async ({ page }) => {
  await launch(page);
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await expect(page.locator('#demoNotice')).toBeVisible();
  await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
  await expect(page.locator('#textViewOnly')).toBeVisible();
  await expect(page.locator('#btnSaveChanges')).toBeHidden();
  await page.locator('#textViewOnly').click();
  await expect(page.getByRole('dialog', { name: 'Read-only mode', exact: true })).toContainText('always read only');
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.locator('.recent-transaction').first().click();
  await expect(page.locator('#inputDescription')).toBeDisabled();
  await expect(page.locator('#inlineInput')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#unsavedWarning')).toBeHidden();
  await page.locator('#btnCloseFile').click();
  await openRawCSV(page, 'DateTime,Amount,Description,Category,Subcategory,Tags,Notes\n2026-11-02,-1,Personal,Bar,Coffee,,', 'demo.csv');
  await expect(page.locator('#demoNotice')).toHaveCount(0);
  await tab(page, 'Transactions');
  await page.locator('#transactionsTbody .mobile-row-click').click();
  await page.locator('#inputDescription').fill('Kept test');
  await saveModal(page);
  await expect(page.locator('#btnSaveChanges')).toBeVisible();
  await expect(page.locator('#btnSaveChanges')).toBeEnabled();
});
