import assert from 'node:assert/strict';
import test from 'node:test';
import Papa from 'papaparse';
import { fileSystemHarness } from '../helpers/fileSystem.mjs';
import { parseTransactionsCSV, serializeTransactionsCSV } from '../../assets/js/csv.js';

const row = { DateTime: '2026-11-02T12:00:00+01:00', Amount: -10, Description: 'Original', Category: 'Bar', Subcategory: 'Coffee', Tags: '', Notes: 'Keep, "this"\nunchanged' };
const text = serializeTransactionsCSV([row], Papa);

test('load → edit → real CSV save → reopen preserves fields and creates fresh internal IDs', async () => {
  const { context, state, writes } = fileSystemHarness();
  await context.openFileFromHandle({ name: 'original.csv', getFile: async () => ({ text: async () => text }) });
  const originalId = state.transactions[0].id;
  state.transactions[0].Description = 'Edited';
  state.transactions[0].Amount = -12.5;
  state.analyticsExclusions.categories.add('Investments');
  state.analyticsReturnContext = { searchQuery: 'previous' };
  let saved;
  state.fileHandle = { createWritable: async () => ({ write: async value => { saved = value; writes.push(value); }, close: async () => {} }) };
  state.hasUnsavedChanges = true;
  await context.saveFile();
  assert.equal(state.hasUnsavedChanges, false);
  assert.equal(state.originalTransactions[0].Description, 'Edited');
  assert(state.analyticsExclusions.categories.has('Investments'));
  assert.equal(state.analyticsReturnContext.searchQuery, 'previous');
  assert.deepEqual(parseTransactionsCSV(saved, Papa).transactions, [{ ...row, Amount: -12.5, Description: 'Edited' }]);
  await context.openFileFromHandle({ name: 'reopened.csv', getFile: async () => ({ text: async () => saved }) });
  assert.notEqual(state.transactions[0].id, originalId);
  assert.equal(state.analyticsExclusions.categories.size, 0);
  assert.equal(state.analyticsReturnContext, null);
});

test('invalid CSV does not replace current data, baseline or exclusions', () => {
  const { context, state } = fileSystemHarness();
  assert(context.parseCSV(text));
  state.analyticsExclusions.categories.add('Bar');
  const before = JSON.stringify(state.transactions);
  assert.equal(context.parseCSV('wrong,header\n1,2'), false);
  assert.equal(JSON.stringify(state.transactions), before);
  assert(state.analyticsExclusions.categories.has('Bar'));
});

test('opening an incompatible file does not change the active filename or writable handle', async () => {
  const { context, state } = fileSystemHarness();
  context.parseCSV(text);
  const handle = state.fileHandle;
  await context.openFileFromHandle({ name: 'bad.csv', getFile: async () => ({ text: async () => 'wrong,header\n1,2' }) });
  assert.equal(state.fileHandle, handle);
  assert.equal(state.fileName, 'expenses.csv');
  assert.equal(state.transactions[0].Description, 'Original');
});

for (const phase of ['createWritable', 'write', 'close']) {
  test(`save failure during ${phase} retains dirty state and last saved baseline`, async () => {
    const { context, state, alerts } = fileSystemHarness();
    context.parseCSV(text);
    state.originalTransactions = structuredClone(state.transactions);
    state.transactions[0].Amount = -20;
    state.hasUnsavedChanges = true;
    const fail = async () => { throw new Error('Permission denied'); };
    state.fileHandle = { createWritable: phase === 'createWritable' ? fail : async () => ({
      write: phase === 'write' ? fail : async () => {}, close: phase === 'close' ? fail : async () => {}
    }) };
    await context.saveFile();
    assert.equal(state.hasUnsavedChanges, true);
    assert.equal(state.originalTransactions[0].Amount, -10);
    assert(alerts.at(-1).includes('Failed to save'));
  });
}

test('cancelled share keeps dirty state and does not trigger a download', async () => {
  const { context, state } = fileSystemHarness({ window: {}, navigator: {
    canShare: () => true, share: async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); }
  } });
  context.parseCSV(text);
  state.hasUnsavedChanges = true;
  await context.saveFile();
  assert.equal(state.hasUnsavedChanges, true);
});

test('undo cancellation, confirmed undo and close respect the last saved snapshot', () => {
  let confirmed = false;
  const { context, state } = fileSystemHarness({ confirm: () => confirmed });
  context.parseCSV(text);
  state.originalTransactions = structuredClone(state.transactions);
  state.transactions[0].Amount = -20;
  state.hasUnsavedChanges = true;
  context.undoChanges();
  assert.equal(state.transactions[0].Amount, -20);
  context.closeFile();
  assert.equal(state.fileName, 'expenses.csv');
  confirmed = true;
  context.undoChanges();
  assert.equal(state.transactions[0].Amount, -10);
  assert.equal(state.hasUnsavedChanges, false);
  context.closeFile();
  assert.equal(state.transactions.length, 0);
  assert.equal(state.fileName, '');
});
