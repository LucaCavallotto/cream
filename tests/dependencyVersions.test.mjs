import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('runtime libraries are pinned in the lockfile and shipped through Vite instead of CDN scripts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dependencies = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).dependencies;
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
  for (const [name, version] of Object.entries(dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.equal(lock.packages[`node_modules/${name}`].version, version, name);
  }
  assert.equal(dependencies.react, dependencies['react-dom']);
  assert.match(html, /type="module" src="\/src\/main.jsx"/);
  assert.doesNotMatch(html, /cdn\.jsdelivr|<script[^>]*src="https:/);
});
