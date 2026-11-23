import { test } from './fixtures.mjs';
import { checkTickerScroll } from './ticker-scroll.mjs';

for (const width of [390, 1280]) test(`ticker scrolls away while header and navigation remain available at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await checkTickerScroll(page);
});
