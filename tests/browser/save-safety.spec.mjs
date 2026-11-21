import { test, expect, launch, openRows, row, addModal, saveModal } from './fixtures.mjs';

test.describe('blocked CSV download', () => {
  test.use({ acceptDownloads: false });
  test('keeps unsaved edits and close confirmation after a rejected download', async ({ page }) => {
    await launch(page); await openRows(page, [row()]);
    await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -5, Pending'); await saveModal(page);
    const pending = page.waitForEvent('download'); await page.locator('#btnSaveChanges').click();
    expect(await (await pending).failure()).toBeTruthy();
    await expect(page.locator('#downloadConfirmation')).toBeVisible();
    await expect(page.locator('#unsavedWarning')).toBeVisible();
    await page.getByRole('button', { name: 'Keep unsaved', exact: true }).click();
    const dialog = page.waitForEvent('dialog');
    const closing = page.locator('#btnCloseFile').click();
    await (await dialog).dismiss(); await closing;
    await expect(page.locator('#appView')).toBeVisible();
    await expect(page.locator('#transactionsTbody')).toContainText('Pending');
  });
});

test('confirming a downloaded snapshot keeps later edits dirty', async ({ page }) => {
  await launch(page); await openRows(page, [row()]);
  await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -5, Exported'); await saveModal(page);
  const download = page.waitForEvent('download'); await page.locator('#btnSaveChanges').click();
  await (await download).path();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -2, Later edit'); await saveModal(page);
  await page.locator('#btnConfirmDownload').click();
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  page.once('dialog', dialog => dialog.accept()); await page.locator('#btnUndoChanges').click();
  await expect(page.locator('#transactionsTbody')).toContainText('Exported');
  await expect(page.locator('#transactionsTbody')).not.toContainText('Later edit');
});
