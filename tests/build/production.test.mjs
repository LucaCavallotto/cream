import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

for (const file of ['data/categories.json', 'demo.csv', 'manifest.json']) {
  test(`production build preserves ${file} exactly`, async () => {
    assert.deepEqual(
      await readFile(resolve('dist', file)),
      await readFile(resolve(file)),
    );
  });
}
test('production HTML ships relative, existing bundles without CDN or source scripts', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /cdn\.jsdelivr|src\/main.jsx|assets\/js\/app.js/);
  const paths = [...html.matchAll(/(?:src|href)="([^"\n]+)"/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith('data:'));
  assert(paths.some((path) => /\.js$/.test(path)));
  assert(paths.some((path) => /\.css$/.test(path)));
  assert(paths.includes('manifest.json'));
  for (const path of paths) {
    assert(
      !path.startsWith('/') && !path.includes('://'),
      `Non-relative deployment asset: ${path}`,
    );
    assert(
      (await stat(resolve('dist', path))).isFile(),
      `Missing production asset: ${path}`,
    );
  }
});

test('cream branding and manifest reference the shipped local icon', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
  assert.equal(manifest.name, 'cream');
  assert.equal(manifest.short_name, 'cream');
  assert.equal(manifest.icons[0].src, './cream.svg');
  assert.deepEqual(
    await readFile('dist/cream.svg'),
    await readFile('public/cream.svg'),
  );
  assert.match(
    await readFile('dist/index.html', 'utf8'),
    /<title>cream — A clearer view of your money\.<\/title>/,
  );
});
