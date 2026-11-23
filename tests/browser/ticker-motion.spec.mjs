import { test, launch, openRows, row } from './fixtures.mjs';
import { expectTickerSpeed, expectTickerPaused, expectTickerResumesAt } from './ticker-motion.mjs';

for (const loaded of [false, true]) test(`ticker keeps its position and speed after repeated click keyboard and hover pauses (${loaded ? 'dataset' : 'landing'})`, async ({ page }) => {
  await launch(page);
  if (loaded) await openRows(page, [row()]);
  await page.mouse.move(0, 300);
  await expectTickerSpeed(page);
  const ticker = page.locator('.ticker-viewport');
  for (let cycle = 0; cycle < 3; cycle++) {
    await ticker.click();
    await page.mouse.move(0, 300);
    const paused = await expectTickerPaused(page);
    await ticker.click();
    await page.mouse.move(0, 300);
    await expectTickerResumesAt(page, paused);
  }
  await ticker.focus();
  await page.keyboard.press('Enter');
  let paused = await expectTickerPaused(page);
  await page.keyboard.press('Space');
  await expectTickerResumesAt(page, paused);
  await ticker.hover();
  paused = await expectTickerPaused(page);
  await page.mouse.move(0, 300);
  await expectTickerResumesAt(page, paused);
});
