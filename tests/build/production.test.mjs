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
