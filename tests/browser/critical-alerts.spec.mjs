import { test, expect, launch, openRows, row, addModal, saveModal } from './fixtures.mjs';

async function refreshPrompt(page) {
  const pending = page.waitForEvent('dialog');
  await page.evaluate(() => { setTimeout(() => location.reload(), 0); });
  const dialog = await pending;
  expect(dialog.type()).toBe('beforeunload');
  return dialog;
}

test('native close and refresh confirmations protect pending file edits', async ({ page }) => {
  await launch(page); await openRows(page, [row('Original')]);
  await addModal(page); await page.locator('#inlineInput').fill('2026-11-21, -5, Pending'); await saveModal(page);
  const pending = page.waitForEvent('dialog');
  const closing = page.locator('#btnCloseFile').click();
  const dialog = await pending;
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toContain('unsaved changes');
  await dialog.dismiss(); await closing;
  await expect(page.locator('#transactionsTbody')).toContainText('Pending');
  await (await refreshPrompt(page)).dismiss();
  await expect(page.locator('#transactionsTbody')).toContainText('Pending');
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await page.getByRole('tab', { name: 'Transactions', exact: true }).click();
  const accepting = page.waitForEvent('dialog');
  const reload = page.reload();
  await (await accepting).accept();
  await reload;
  await expect(page.locator('#landingView')).toBeVisible();
  await expect(page.locator('#currentFileName')).toHaveCount(0);
});

test('native refresh warning also protects unsubmitted editor fields', async ({ page }) => {
  await launch(page); await openRows(page, [row('Original')]);
  await addModal(page);
  await page.locator('#inputDescription').fill('Draft not yet added');
  await (await refreshPrompt(page)).dismiss();
  await expect(page.locator('#inputDescription')).toHaveValue('Draft not yet added');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const warns = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event); return event.defaultPrevented;
  });
  expect(warns).toBe(false);
  await expect(page.locator('#unsavedWarning')).toBeHidden();
});
