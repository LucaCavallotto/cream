import { test, expect, launch, openRawCSV, row, headers, tab, unlockFile, addModal, saveModal } from './fixtures.mjs';
import Papa from 'papaparse';
const text = Papa.unparse({ fields: headers, data: [row('Coffee', -10), row('Salary', 100, 'Income', 'Salary')].map(t => headers.map(key => t[key])) });

test('files open protected and cream returns to Overview without closing or losing edits', async ({ page }) => {
  await launch(page);
  await openRawCSV(page, text, 'protected.csv', { editable: false });
  await expect(page.locator('#btnToggleViewOnly')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#btnAddExpense')).toBeHidden();
  await unlockFile(page);
  await addModal(page);
  await page.locator('#inlineInput').fill('2026-11-18, -2, Pending');
  await saveModal(page);
  await tab(page, 'Transactions');
  await page.getByRole('searchbox').fill('Coffee');
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await expect(page.locator('#overview-tab-pane')).toBeVisible();
  await expect(page.locator('#currentFileName')).toHaveText('protected.csv');
  await expect(page.locator('#unsavedWarning')).toBeVisible();
  await expect(page.locator('#inputSearchTransaction')).toHaveValue('Coffee');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#btnCloseFile').click();
  await openRawCSV(page, text, 'again.csv', { editable: false });
  await expect(page.locator('#btnToggleViewOnly')).toHaveAttribute('aria-pressed', 'true');
});

test('Overview callouts route to matching analytics periods and use the shared cash-flow chart', async ({ page }) => {
  await launch(page);
  await openRawCSV(page, text, 'overview.csv', { editable: false });
  await expect(page.locator('.ticker-caption')).toHaveCount(0);
  await expect(page.locator('.overview .card-callout')).toHaveCount(5);
  await expect(page.locator('.health-ring')).not.toContainText('no issues');
  const ring = await page.locator('.health-ring').boundingBox();
  const caption = await page.locator('.health-ring-caption').boundingBox();
  expect(caption.y).toBeGreaterThanOrEqual(ring.y + ring.height);
  await page.getByRole('button', { name: 'This month.', exact: true }).click();
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('current_month');
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await page.getByRole('button', { name: 'Explore cash flow', exact: false }).click();
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('last_12_months');
  await expect(page.locator('#overviewCashFlowChart')).toHaveAttribute('aria-label', await page.locator('#cashFlowLineChart').getAttribute('aria-label'));
  await page.getByRole('button', { name: 'cream home', exact: true }).click();
  await page.getByRole('button', { name: 'Explore analytics', exact: false }).click();
  await expect(page.locator('#analyticsTimePeriod')).toHaveValue('overall');
  await expect(page.locator('.footer-note')).not.toContainText('↗');
  await expect(page.locator('.ledger-footer')).not.toContainText('↗');
});
