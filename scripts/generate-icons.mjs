// Render the existing vector mark deterministically; no external image service.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/cream.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, size, maskable] of [['apple-touch-icon.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
    const data = await page.evaluate(async ({ source, size, maskable }) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const context = canvas.getContext('2d'); context.fillStyle = '#111'; context.fillRect(0, 0, size, size);
      const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source); await image.decode();
      const inset = maskable ? size * .15 : 0;
      context.drawImage(image, inset, inset, size - 2 * inset, size - 2 * inset);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { source, size, maskable });
    await writeFile(new URL('../public/' + name, import.meta.url), Buffer.from(data, 'base64'));
  }
} finally { await browser.close(); }
