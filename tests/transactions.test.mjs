import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTags, compareTransactions } from '../assets/js/transactions.js';

test('tag normalization handles legacy commas, whitespace, prefixes, duplicates and idempotence', () => {
  for (const value of ['', null, undefined]) assert.equal(normalizeTags(value), '');
  const normalized = normalizeTags('work, #home\n##work  ###holiday\t#home');
  assert.equal(normalized, '#work #home #holiday');
  assert.equal(normalizeTags(normalized), normalized);
  assert.equal(normalizeTags('caffè #旅行'), '#caffè #旅行');
});

test('date sorting compares instants across timezones and puts invalid values last', () => {
  const rows = [{ DateTime: '2026-11-02T10:00:00+02:00' }, { DateTime: '2026-11-02T09:00:00Z' }, { DateTime: 'bad' }];
  const descending = [...rows].sort((a, b) => compareTransactions(a, b, { column: 'Date', direction: 'desc' }));
  assert.equal(descending[0], rows[1]);
  assert.equal(descending[2], rows[2]);
});

test('amount sorting handles signs, numerical order and invalid values in either direction', () => {
  const rows = [-2, -100, 50, 'bad'].map(Amount => ({ Amount }));
  for (const direction of ['asc', 'desc']) {
    const sorted = [...rows].sort((a, b) => compareTransactions(a, b, { column: 'Amount', direction }));
    assert.equal(sorted.at(-1).Amount, 'bad');
    assert.equal(sorted[0].Amount, direction === 'asc' ? -100 : 50);
  }
  assert(compareTransactions({ Description: 'Apple' }, { Description: 'Pear' }, { column: 'Description', direction: 'asc' }) < 0);
});
