import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseInlineRow } from '../assets/js/inlineInput.js';

const categories = JSON.parse(readFileSync(new URL('../public/data/categories.json', import.meta.url)));
const base = ['2026-11-02T14:28:36+01:00', '€-1', 'Caffè'];

test('legacy input needs no classification', () => {
  const row = parseInlineRow(base, categories, 1);
  assert.equal(row.error, undefined);
  assert.equal(row.hasCategory, false);
  assert.equal(row.transaction.Amount, -1);
  assert.equal(row.transaction.Description, 'Caffè');
});

test('classification matches canonical names regardless of casing', () => {
  const row = parseInlineRow([...base, ' bar ', 'coffee'], categories, 1);
  assert.equal(row.transaction.Category, 'Bar');
  assert.equal(row.transaction.Subcategory, 'Coffee');
  assert.deepEqual(row.warnings, []);
});

test('unknown category and its subcategory are omitted with row-specific warnings', () => {
  const row = parseInlineRow([...base, 'Missing Category', 'Coffee'], categories, 3);
  assert.equal(row.transaction.Category, '');
  assert.equal(row.transaction.Subcategory, '');
  assert.equal(row.warnings.length, 2);
  assert(row.warnings.every(message => message.startsWith('Line 3:')));
});

test('invalid subcategory keeps the valid category; translated names are not guessed', () => {
  const row = parseInlineRow([...base, 'Bar', 'Caffe'], categories, 1);
  assert.equal(row.transaction.Category, 'Bar');
  assert.equal(row.transaction.Subcategory, '');
  assert.equal(row.warnings.length, 1);
});

test('a subcategory must belong to the supplied category', () => {
  const row = parseInlineRow([...base, 'Bar', 'Salary'], categories, 1);
  assert.equal(row.transaction.Subcategory, '');
  assert.equal(row.warnings.length, 1);
});

test('category alone and explicitly empty classification are supported', () => {
  assert.equal(parseInlineRow([...base, 'Bar'], categories, 1).transaction.Category, 'Bar');
  const empty = parseInlineRow([...base, '', ''], categories, 1);
  assert.equal(empty.hasCategory, true);
  assert.equal(empty.transaction.Category, '');
  assert.deepEqual(empty.warnings, []);
});

test('date-only, UTC, leap days and decimal amounts are supported', () => {
  for (const date of ['2026-11-02', '2026-11-02T14:28:36Z', '2024-02-29T10:00:00+01:00']) {
    const row = parseInlineRow([date, '+2.50', 'Description, with comma'], categories, 1);
    assert.equal(row.error, undefined);
    assert.equal(row.transaction.Amount, 2.5);
  }
  assert.equal(parseInlineRow([base[0], '-1,50', 'Coffee'], categories, 1).transaction.Amount, -1.5);
});

test('invalid core fields and unexpected columns are rejected', () => {
  for (const date of ['2026-02-30', '2025-02-29', '2026-11-02T25:00:00Z', 'invalid']) {
    assert(parseInlineRow([date, '-1', 'Coffee'], categories, 1).error);
  }
  for (const amount of ['€', 'abc1', '1.2.3', 'Infinity', '--1']) {
    assert(parseInlineRow([base[0], amount, 'Coffee'], categories, 1).error);
  }
  assert(parseInlineRow([base[0], '-1', ' '], categories, 1).error);
  assert(parseInlineRow(base.slice(0, 2), categories, 1).error);
  assert(parseInlineRow([...base, 'Bar', 'Coffee', 'extra'], categories, 1).error);
});
