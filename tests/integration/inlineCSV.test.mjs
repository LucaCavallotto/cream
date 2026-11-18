import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Papa from 'papaparse';
import { parseInlineCSV } from '../../assets/js/inlineInput.js';
const categories = JSON.parse(readFileSync(new URL('../../data/categories.json', import.meta.url)));

test('quick input handles spaces before quoted descriptions with real PapaParse', () => {
  const parsed = parseInlineCSV('2026-11-02, €-1, "Coffee, cake", Bar, Coffee', categories, Papa);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows[0].transaction.Description, 'Coffee, cake');
});

test('quick input preserves quoted multiline text, escaped quotes and embedded comma-space-quote sequences', () => {
  const text = '2026-11-02, -1, "First line\nCoffee, ""cake""", Bar, Coffee\n2026-11-03, 30, Freelance, Income, Freelance';
  const parsed = parseInlineCSV(text, categories, Papa);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].transaction.Description, 'First line\nCoffee, "cake"');
});

test('quick input classifies each record and distinguishes errors from classification warnings', () => {
  const parsed = parseInlineCSV('2026-11-02, -1, Old format\n2026-11-03, -2, Unknown, Wrong, Coffee\n2026-02-30, -3, Bad date', categories, Papa);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.warnings.length, 2);
  assert.equal(parsed.errors.length, 1);
  assert(parsed.errors[0].startsWith('Line 3'));
});

test('quick input rejects malformed quotes instead of interpreting partial fields', () => {
  assert(parseInlineCSV('2026-11-02, -1, "Not closed', categories, Papa).errors.length > 0);
});
