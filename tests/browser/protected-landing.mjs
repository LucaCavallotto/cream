import { expect, launch } from './fixtures.mjs';

export async function checkProtectedLanding(page, info, protectedDevice = true) {
  await launch(page);
  if (!protectedDevice) {
    await expect(page.locator('#btnCreateNewFile')).toBeVisible();
    await expect(page.locator('.landing-read-only-note')).toHaveCount(0);
    return;
  }
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await expect(page.locator('body')).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(11, 12, 11)' : 'rgb(255, 255, 255)');
    for (const width of [320, 390, 767, 810, 1080]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('.landing-new-file')).toHaveCount(0);
      await expect(page.locator('#btnCreateNewFile')).toHaveCount(0);
      await expect(page.getByText('START FRESH', { exact: true })).toHaveCount(0);
      await expect(page.locator('.landing-read-only-note')).toHaveText('Create and edit your file on a computer. This device supports viewing only.');
      await expect(page.getByRole('button', { name: 'Browse Files', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: /Take a look around/ })).toBeEnabled();
      const welcome = await page.locator('.landing-welcome').boundingBox();
      const open = await page.locator('#dropZone').boundingBox();
      if (width < 768) expect(open.y).toBeGreaterThanOrEqual(welcome.y + welcome.height);
      else expect(open.x).toBeGreaterThanOrEqual(welcome.x + welcome.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([390, 810].includes(width)) await page.screenshot({ path: info.outputPath(`protected-landing-${width}-${colorScheme}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    }
  }
  await page.getByRole('button', { name: /Take a look around/ }).tap();
  await expect(page.locator('#currentFileName')).toHaveText('demo.csv');
  await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
}
