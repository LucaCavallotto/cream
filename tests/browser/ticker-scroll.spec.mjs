import { test } from './fixtures.mjs';
import { checkTickerScroll } from './ticker-scroll.mjs';

for (const width of [390, 1280]) test(`ticker scrolls away while header and navigation remain available at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await checkTickerScroll(page);
});

test('scrolling beyond the top keeps content and fixed navigation aligned', async ({page}) => {
  const {expect, launch, openRows, row}=await import('./fixtures.mjs');
  await launch(page);
  await openRows(page,Array.from({length:30},(_,i)=>row(`Boundary ${i}`,-1)));
  for (const colorScheme of ['light','dark']) {
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
    await page.evaluate(()=>window.scrollTo(0,0));
    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y','none');
    await expect.poll(async()=>{
      const header=await page.locator('.app-chrome').boundingBox();
      const ticker=await page.locator('.money-ticker').boundingBox();
      const sidebar=await page.locator('.workspace-sidebar').boundingBox();
      return Math.abs(sidebar.y-header.height-ticker.height);
    }).toBeLessThan(1);
    const original=await page.locator('.workspace-sidebar').boundingBox();
    await page.mouse.move(800,300);
    for(let i=0;i<4;i++) await page.mouse.wheel(0,-700);
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
    expect((await page.locator('.app-chrome').boundingBox()).y).toBe(0);
    expect((await page.locator('.workspace-sidebar').boundingBox()).y).toBe(original.y);
    // Emulated browsers do not reproduce the OS rubber-band gesture. Exercise
    // Safari's transient out-of-bounds geometry separately as a fallback check.
    await page.evaluate(()=>{
      const ticker=document.querySelector('.money-ticker');
      ticker.originalBounds=ticker.getBoundingClientRect;
      ticker.getBoundingClientRect=function(){
        const rect=this.originalBounds();
        return new DOMRect(rect.x,rect.y+80,rect.width,rect.height);
      };
      window.dispatchEvent(new Event('scroll'));
      return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    await expect.poll(async()=>Number.parseFloat(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--chrome-height')))).toBeCloseTo(original.y,0);
    await page.evaluate(()=>{
      const ticker=document.querySelector('.money-ticker');
      ticker.getBoundingClientRect=ticker.originalBounds;
      delete ticker.originalBounds;
    });
    await page.mouse.wheel(0,500);
    await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async()=> (await page.locator('.workspace-sidebar').boundingBox()).y).toBeCloseTo((await page.locator('.app-chrome').boundingBox()).height,0);
  }
});
