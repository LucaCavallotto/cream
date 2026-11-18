import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { analyzeDataset, getTransactionIssues, isValidTransactionDate, parseImportedAmount } from '../assets/js/datasetHealth.js';
import { createAnalyticsExclusions } from '../assets/js/analyticsScope.js';

const categories = JSON.parse(readFileSync(new URL('../data/categories.json', import.meta.url)));
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

test('unknown classifications and mismatched subcategories are detected without changing values', () => {
  assert.deepEqual(codes({ Category: 'Legacy' }), ['unknown_category', 'invalid_subcategory']);
  assert.deepEqual(codes({ Subcategory: 'Salary' }), ['invalid_subcategory']);
  assert.deepEqual(codes({ Category: 'bar' }), ['unknown_category', 'invalid_subcategory']);
  assert.deepEqual(codes({ Category: '__proto__' }), ['unknown_category', 'invalid_subcategory']);
  const original = { ...transaction, Category: 'Travel', Subcategory: 'Transport' };
  assert(getTransactionIssues(original, categories).some(issue => issue.code === 'invalid_subcategory'));
  assert.equal(original.Subcategory, 'Transport');
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

test('CSV load, save and undo preserve unresolved values and report health consistently', async () => {
  const raw = { ...transaction, Amount: '12oops', Category: 'Legacy', Subcategory: 'Unknown' };
  const headers = ['DateTime', 'Amount', 'Description', 'Category', 'Subcategory', 'Tags', 'Notes'];
  delete raw.id;
  let exported;
  let written;
  const state = { categories, transactions: [], fileName: 'test.csv', fileHandle: {
    async createWritable() { return { async write(value) { written = value; }, async close() {} }; }
  } };
  const context = vm.createContext({ state, parseImportedAmount, createAnalyticsExclusions, normalizeTags: s => s,
    crypto: { randomUUID: () => 'imported' }, console: { log() {}, error() {} },
    window: { showSaveFilePicker: true }, confirm: () => true, alert: message => assert.fail(message),
    clearUnsavedChanges() {}, renderApp() {}, showStatusMessage() {},
    Papa: {
      parse: () => ({ data: [raw], errors: [], meta: { fields: headers } }),
      unparse: rows => { exported = rows; return JSON.stringify(rows); }
    }
  });
  const source = readFileSync(new URL('../assets/js/fileSystem.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  vm.runInContext(source, context);
  assert(context.parseCSV('fixture'));
  assert.equal(state.transactions[0].Amount, '12oops');
  assert.equal(analyzeDataset(state.transactions, categories).counts.invalid_amount, 1);
  state.analyticsExclusions.categories.add('Investments');
  await context.saveFile();
  assert.equal(exported[0].Amount, '12oops');
  assert.equal(exported[0].Category, 'Legacy');
  assert(!Object.hasOwn(exported[0], 'id'));
  assert(!Object.hasOwn(exported[0], 'analyticsExclusions'));
  assert(state.analyticsExclusions.categories.has('Investments'));
  assert(written.includes('12oops'));
  state.transactions[0].Amount = -12;
  state.transactions[0].Category = 'Bar';
  state.transactions[0].Subcategory = 'Coffee';
  assert.equal(analyzeDataset(state.transactions, categories).dirty.length, 0);
  context.undoChanges();
  assert.equal(analyzeDataset(state.transactions, categories).dirty.length, 1);
  assert.equal(state.transactions[0].Amount, '12oops');
  assert(state.analyticsExclusions.categories.has('Investments'));
  assert(context.parseCSV('fixture'));
  assert.equal(state.analyticsExclusions.categories.size, 0);
});
