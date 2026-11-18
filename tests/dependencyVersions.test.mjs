import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('offline browser fixtures use the exact third-party versions referenced by the app', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dependencies = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).devDependencies;
  const matches = [...html.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/([^@/]+)@([^/]+)\//g)];
  assert(matches.length > 0);
  for (const [, name, version] of matches) assert.equal(dependencies[name], version, name);
});
