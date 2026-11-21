import { test, expect, launch, openRows, row, addModal, saveModal, downloadRows } from './fixtures.mjs';

test('editing a foreign-offset timestamp uses local date and preserves untouched precision', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Offset', -1, 'Bar', 'Coffee', '2026-11-02T23:30:36-05:00'), row('Fraction', -2, 'Bar', 'Coffee', '2026-07-02T14:28:36.123Z')]);
  const offset = () => page.locator('#transactionsTbody .mobile-row-click').filter({ hasText: 'Offset' });
  await offset().locator('.btn-edit').click();
  await expect(page.locator('#inputDate')).toHaveValue('2026-11-03');
  await expect(page.locator('#inputTime')).toHaveValue('05:30:36');
  await page.locator('#inputDescription').fill('Offset renamed'); await saveModal(page);
  await page.locator('#transactionsTbody .mobile-row-click').filter({ hasText: 'Fraction' }).locator('.btn-edit').click();
  await expect(page.locator('#inputTime')).toHaveValue('16:28:36');
  await page.locator('#inputDescription').fill('Fraction renamed'); await saveModal(page);
  let saved = await downloadRows(page);
  expect(saved.rows.find(t => t.Description === 'Offset renamed').DateTime).toBe('2026-11-02T23:30:36-05:00');
  expect(saved.rows.find(t => t.Description === 'Fraction renamed').DateTime).toBe('2026-07-02T14:28:36.123Z');
  await offset().locator('.btn-edit').click();
  await page.locator('#inputTime').fill('05:31:36'); await saveModal(page);
  saved = await downloadRows(page);
  const value = saved.rows.find(t => t.Description === 'Offset renamed').DateTime;
  expect(value).toBe('2026-11-03T05:31:36+01:00');
  expect(new Date(value).getTime() - new Date('2026-11-02T23:30:36-05:00').getTime()).toBe(60000);
});

test('single inline input converts its offset for the editor and retains it when unchanged', async ({ page }) => {
  await launch(page); await openRows(page, []); await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-02T23:30:36-05:00, -1, Offset inline');
  await expect(page.locator('#inputDate')).toHaveValue('2026-11-03');
  await expect(page.locator('#inputTime')).toHaveValue('05:30:36');
  await saveModal(page);
  expect((await downloadRows(page)).rows[0].DateTime).toBe('2026-11-02T23:30:36-05:00');
});

test('a local time skipped by daylight saving cannot be silently saved', async ({ page }) => {
  await launch(page); await openRows(page, []); await addModal(page);
  await page.locator('#inputDate').fill('2026-03-29');
  await page.locator('#inputTime').fill('02:30:00');
  await page.locator('#inputAmount').fill('-1');
  await page.locator('#inputDescription').fill('DST gap');
  await page.locator('#btnSaveTransaction').click();
  await expect(page.locator('#inlineInputFeedback')).toContainText('does not exist');
  await expect(page.locator('#expenseModal')).toBeVisible();
  await page.locator('#inputTime').fill('03:30:00'); await saveModal(page);
  expect((await downloadRows(page)).rows[0].DateTime).toBe('2026-03-29T03:30:00+02:00');
});
