import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { parseInlineCSV } from '../../assets/js/inlineInput.js';
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const categories = JSON.parse(readFileSync(new URL('../../public/data/categories.json', import.meta.url)));
test('README quick-entry examples remain copyable with the shipped catalog', () => {
  const examples = [...readme.matchAll(/```text\n(2026-[\s\S]*?)\n```/g)].map(match => match[1]);
  assert.equal(examples.length, 2);
  const valid = parseInlineCSV(examples[0], categories, Papa);
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.warnings, []);
  assert.equal(valid.rows.length, 5);
  const warnings = parseInlineCSV(examples[1], categories, Papa);
  assert.deepEqual(warnings.errors, []);
  assert.equal(warnings.warnings.length, 3);
});
