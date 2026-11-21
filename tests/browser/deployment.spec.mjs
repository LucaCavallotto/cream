import { test, expect, tab } from './fixtures.mjs';

test('the production site opens its demo and analytics under a GitHub Pages directory path', async ({ page }) => {
  const resources = [];
  page.on('request', request => {
    if (['document', 'script', 'stylesheet', 'font', 'fetch'].includes(request.resourceType())) resources.push(new URL(request.url()).pathname);
  });
  // Mount the real built site at /cream/ without changing the build or sources.
  await page.route('**/cream/**', async route => {
    const upstream = new URL(route.request().url());
    upstream.pathname = upstream.pathname.replace(/^\/cream\//, '/');
    await route.fulfill({ response: await route.fetch({ url: upstream.toString() }) });
  });
  await page.goto('/cream/');
  await expect(page.getByRole('button', { name: 'Browse Files', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: /Take a look around/ }).click();
  await expect(page.locator('#currentFileName')).toHaveText('demo.csv');
  await expect(page.locator('#btnToggleViewOnly')).toBeHidden();
  await tab(page, 'Analytics');
  await expect(page.locator('#cashFlowLineChart')).toBeVisible();
  const homeScreen = await page.evaluate(async () => {
    const response = await fetch(new URL('manifest.json', location.href));
    const manifest = await response.json();
    return { status: response.status, start: new URL(manifest.start_url, response.url).pathname, apple: new URL(document.querySelector('link[rel="apple-touch-icon"]').href).pathname };
  });
  expect(homeScreen).toEqual({ status: 200, start: '/cream/index.html', apple: '/cream/apple-touch-icon.png' });
  expect(resources.length).toBeGreaterThan(4);
  expect(resources.every(path => path.startsWith('/cream/')), resources.join('\n')).toBe(true);
});
