import { expect, launch, openRows, row, tab } from './fixtures.mjs';

export async function checkTickerScroll(page) {
  await launch(page);
  await openRows(page, Array.from({ length: 30 }, (_, index) => row(`Scroll sample ${index}`, -index - 1)));
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await page.locator('.money-ticker').boundingBox()).y).toBeGreaterThan(0);
    const header = page.locator('.app-chrome');
    const top = await header.boundingBox();
    await expect.poll(async () => Number.parseFloat(await page.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--chrome-height')))).toBeCloseTo(top.height + 38, 0);
    await page.evaluate(() => window.scrollTo(0, 20));
    await expect.poll(async () => (await page.locator('.money-ticker').boundingBox()).y + 20).toBeCloseTo(top.height, 0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => {
      const ticker = await page.locator('.money-ticker').boundingBox();
      return ticker.y + ticker.height;
    }).toBeLessThan(0);
    await expect.poll(async () => {
      const chrome = await header.boundingBox();
      const navigation = await page.locator('.workspace-sidebar').boundingBox();
      if (page.viewportSize().width >= 768) return Math.abs(navigation.y - chrome.height);
      return Math.abs(navigation.y + navigation.height - page.viewportSize().height);
    }).toBeLessThan(1);
    expect((await header.boundingBox()).y).toBe(0);
    await expect(page.locator('#btnCloseFile')).toBeInViewport();
    await tab(page, 'Overview');
    await expect(page.locator('.money-ticker')).toBeInViewport();
    await tab(page, 'Transactions');
    await expect(page.locator('.money-ticker')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
}
