import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

test.use({ locale: 'it-IT' });

test('interface, month choices, chart labels and number formatting stay English in an Italian browser', async ({ page }) => {
  await launch(page);
  await openRows(page, [row('Income', 2500, 'Income', 'Salary'),
    row('Coffee', -1000), row('October expense', -100, 'Bar', 'Coffee', '2026-10-02T12:00:00+02:00')]);
  await tab(page, 'Analytics');
  await page.locator('#analyticsTimePeriod').selectOption('current_month');
  await expect(page.getByRole('heading', { name: 'Expenses by Category (November 2026)', exact: true })).toBeVisible();
  await page.locator('#analyticsTimePeriod').selectOption('specific_month');
  await expect(page.locator('#analyticsSpecificMonth option')).toHaveText(['November 2026', 'October 2026']);
  await page.locator('#analyticsSpecificMonth').selectOption('2026-10');
  await expect(page.getByRole('heading', { name: 'Monthly Cash Flow Trend (October 2026)', exact: true })).toBeVisible();
  await page.locator('#analyticsTimePeriod').selectOption('overall');
  const chart = await page.evaluate(() => {
    const line = Chart.getChart(document.getElementById('cashFlowLineChart'));
    return {
      labels: line.data.labels,
      locale: line.options.locale,
      ticks: line.scales.y.ticks.map(tick => tick.label),
      pieLocale: Chart.getChart(document.getElementById('categoryPieChart')).options.locale
    };
  });
  expect(chart.labels).toEqual(['Oct 2026', 'Nov 2026']);
  expect(chart.locale).toBe('en-GB');
  expect(chart.pieLocale).toBe('en-GB');
  expect(chart.ticks).toContain('1,000');
});
