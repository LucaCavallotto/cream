import { expect } from './fixtures.mjs';

export async function position(page) {
  return page.locator('.ticker-track').evaluate(track => {
    const animation = track.getAnimations()[0];
    return { x: new DOMMatrixReadOnly(getComputedStyle(track).transform).m41,
      time: animation.currentTime, width: track.querySelector('.ticker-group').getBoundingClientRect().width };
  });
}

export async function expectTickerSpeed(page) {
  // Measure rendered displacement against animation time, not just CSS duration.
  const before = await position(page);
  await page.waitForTimeout(300);
  const after = await position(page);
  const elapsed = (after.time - before.time) / 1000;
  expect(elapsed).toBeGreaterThan(.1);
  const distance = ((before.x - after.x) % after.width + after.width) % after.width;
  // WebKit can sample compositor transforms one frame behind animation time.
  // Bound the pixel error (two frames at 40px/s), rather than amplify it into a rate.
  expect(Math.abs(distance - elapsed * 40)).toBeLessThan(1.5);
}

export async function expectTickerPaused(page) {
  await expect(page.locator('.ticker-track')).toHaveCSS('animation-play-state', 'paused');
  // Let the pending animation frame settle before checking the frozen position.
  await page.waitForTimeout(100);
  const before = await position(page);
  await page.waitForTimeout(200);
  const after = await position(page);
  expect(Math.abs(after.x - before.x)).toBeLessThan(.1);
  return after;
}

export async function expectTickerResumesAt(page, paused) {
  const after = await position(page);
  // Reconstruct the pause position, allowing time spent delivering the resume event.
  const elapsed = (after.time - paused.time) / 1000;
  const expected = ((-paused.x + elapsed * 40) % after.width + after.width) % after.width;
  expect(Math.abs(-after.x - expected)).toBeLessThan(1);
  await expectTickerSpeed(page);
}
