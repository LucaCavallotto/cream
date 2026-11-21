import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { analyzeDataset, getTransactionIssues, isValidTransactionDate, parseImportedAmount } from '../assets/js/datasetHealth.js';

const categories = JSON.parse(readFileSync(new URL('../public/data/categories.json', import.meta.url)));
const transaction = {
  id: 'test', DateTime: '2026-11-02T14:28:36+01:00', Amount: -1,
  Description: 'Coffee', Category: 'Bar', Subcategory: 'Coffee', Tags: '', Notes: ''
};
const codes = changes => getTransactionIssues({ ...transaction, ...changes }, categories).map(issue => issue.code);

test('complete records, zero amounts, empty tags and notes have no issues', () => {
  assert.deepEqual(codes({}), []);
  assert.deepEqual(codes({ Amount: 0 }), []);
});

test('missing core fields are distinguished from invalid values', () => {
  assert.deepEqual(codes({ DateTime: '', Amount: '', Description: '  ' }), ['missing_date', 'missing_amount', 'missing_description']);
  assert.deepEqual(codes({ DateTime: '2026-02-30', Amount: '12abc' }), ['invalid_date', 'invalid_amount']);
  for (const Amount of [NaN, Infinity, '3']) assert(codes({ Amount }).includes('invalid_amount'));
});

test('valid timestamps and calendar dates reject impossible dates and times', () => {
  for (const date of ['2024-02-29', '2026-11-02T14:28:36Z', '2026-11-02T14:28+01:00']) assert(isValidTransactionDate(date));
  for (const date of ['', '2025-02-29', '2026-04-31', '2026-11-02T24:00:00Z', '2026-11-02T12:60:00Z', '2026-11-02T12:00:00+25:00']) assert(!isValidTransactionDate(date));
});

test('custom classifications are valid, while similar names require manual review', () => {
  assert.deepEqual(codes({ Category: 'Legacy' }), []);
  assert.deepEqual(codes({ Subcategory: 'Salary' }), []);
  const original = { ...transaction, Category: 'bar' };
  const report = analyzeDataset([original], categories);
  assert.equal(report.custom.length, 1);
  assert.equal(report.dirty[0].issues[0].code, 'similar_classification');
  assert.equal(original.Category, 'bar');
  assert.equal(analyzeDataset([{ ...transaction, Category: 'Hobbies', Subcategory: 'Crafts' }], categories).dirty.length, 0);
});

test('missing classifications, orphaned subcategories and uncategorized entries need review', () => {
  assert.deepEqual(codes({ Category: '', Subcategory: '' }), ['missing_category', 'missing_subcategory']);
  assert.deepEqual(codes({ Category: '' }), ['missing_category', 'invalid_subcategory']);
  assert.deepEqual(codes({ Category: 'Other', Subcategory: 'Uncategorized' }), ['uncategorized']);
  assert.deepEqual(codes({ Subcategory: '' }), ['missing_subcategory']);
});

test('duplicate subcategory labels are validated within their parent category', () => {
  assert.deepEqual(codes({ Category: 'Bills', Subcategory: 'Subscriptions' }), []);
  assert.deepEqual(codes({ Category: 'Entertainment', Subcategory: 'Subscriptions' }), []);
});

test('reports count unique dirty records and individual issues and refresh after repairs', () => {
  const transactions = [{ ...transaction }, { ...transaction, id: 'broken', Category: '', Subcategory: '' }];
  const report = analyzeDataset(transactions, categories);
  assert.equal(report.total, 2);
  assert.equal(report.clean, 1);
  assert.equal(report.dirty.length, 1);
  assert.equal(report.dirty[0].recordNumber, 2);
  assert.equal(report.issueCount, 2);
  transactions[1].Category = 'Bar';
  transactions[1].Subcategory = 'Coffee';
  assert.equal(analyzeDataset(transactions, categories).dirty.length, 0);
  assert.equal(analyzeDataset([], categories).issueCount, 0);
});

test('CSV amount parsing preserves missing and malformed data instead of manufacturing zero', () => {
  for (const raw of ['', ' ', '12abc', '1,50', 'NaN', 'Infinity', '€-2']) assert.equal(parseImportedAmount(raw), raw);
  assert.equal(parseImportedAmount('0'), 0);
  assert.equal(parseImportedAmount(' -1.50 '), -1.5);
  assert.equal(parseImportedAmount('+20'), 20);
});

test('original Travel / Transport and newer Trip Transport remain valid', () => {
  assert.deepEqual(codes({ Category: 'Travel', Subcategory: 'Transport' }), []);
  assert.deepEqual(codes({ Category: 'Travel', Subcategory: 'Trip Transport' }), []);
});
