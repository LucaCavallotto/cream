import { test, expect, launch, openRows, row, tab } from './fixtures.mjs';

test('analytics KPI pairs share rows beside a centered balance and stack on narrow screens', async ({ page }) => {
  await launch(page);
  await openRows(page, [
    row('Salary', 2500, 'Income', 'Salary'),
    row('Current expense', -200),
    row('Previous expense', -100, 'Bar', 'Coffee', '2026-10-01'),
  ]);
  await tab(page, 'Analytics');
  const box = selector => page.locator(selector).boundingBox();
  const center = rect => rect.y + rect.height / 2;
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const balance = await box('#metricDelta');
      const flows = await box('.analytics-in-out');
      const comparison = await box('.analytics-comparison');
      if (width >= 992) {
        const netHeading = await box('.analytics-net > .eyebrow');
        const comparisonHeading = await box('.analytics-comparison > .eyebrow');
        expect(Math.abs(netHeading.y - comparisonHeading.y)).toBeLessThan(1);
        expect(Math.abs(center(balance) - center(flows))).toBeLessThan(1);
        for (const [flow, month] of [['Income', 'CurrentMonth'], ['Expenses', 'PrevMonth']]) {
          const flowAmount = page.locator(`#metric${flow}`);
          const monthAmount = page.locator(`#metric${month}`);
          const flowLabel = await flowAmount.locator('xpath=preceding-sibling::span').boundingBox();
          const monthLabel = await monthAmount.locator('xpath=../../span').boundingBox();
          expect(Math.abs(flowLabel.y - monthLabel.y)).toBeLessThan(1);
          expect(Math.abs((await flowAmount.boundingBox()).y - (await monthAmount.boundingBox()).y)).toBeLessThan(1);
        }
      } else {
        expect(flows.y).toBeGreaterThanOrEqual(balance.y + balance.height);
        expect(comparison.y).toBeGreaterThanOrEqual(flows.y + flows.height);
      }
      const current = await box('#metricCurrentMonth .money-amount');
      const prior = await box('#metricPrevMonth .money-amount');
      expect(Math.abs(current.x + current.width - prior.x - prior.width)).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
