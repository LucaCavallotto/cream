import assert from 'node:assert/strict';
import test from 'node:test';
import { appReducer, createAppState } from '../assets/js/appState.js';

const original = {
  id: 'one',
  DateTime: '2026-11-02T12:00:00+01:00',
  Amount: -1,
  Description: 'Coffee',
  Category: 'Bar',
  Subcategory: 'Coffee',
  Tags: '',
  Notes: '',
};
const open = (locked = false) => {
  const state = appReducer(
    appReducer(createAppState(), {
      type: 'categories',
      categories: { Bar: ['Coffee'], Tools: ['Software'] },
    }),
    {
      type: 'open',
      session: {
        fileName: 'test.csv',
        fileHandle: null,
        transactions: [structuredClone(original)],
      },
    },
  );
  return locked ? state : appReducer(state, { type: 'viewOnly' });
};
const edit = (state) =>
  appReducer(state, {
    type: 'upsert',
    id: 'one',
    rows: [{ ...state.transactions[0], Amount: -10 }],
  });

test('reducer updates are immutable and replayable under React StrictMode', () => {
  const state = open(),
    snapshot = structuredClone(state);
  const first = edit(state),
    second = edit(state);
  assert.deepEqual(first, second);
  assert.deepEqual(state, snapshot);
  assert.equal(first.hasUnsavedChanges, true);
  assert.equal(first.originalTransactions[0].Amount, -1);
});

test('undo restores the last successful save without resetting analytics preferences', () => {
  let state = edit(open());
  state.analyticsExclusions.categories.add('Bar');
  state = appReducer(state, {
    type: 'save',
    transactions: state.transactions,
    sessionId: state.sessionId,
  });
  state = appReducer(state, {
    type: 'upsert',
    rows: [{ ...original, id: 'two' }],
  });
  state = appReducer(state, { type: 'undo' });
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].Amount, -10);
  assert.equal(state.hasUnsavedChanges, false);
  assert(state.analyticsExclusions.categories.has('Bar'));
});

test('saving a snapshot retains edits made while the asynchronous write is pending', () => {
  const snapshot = open();
  const state = appReducer(edit(snapshot), {
    type: 'save',
    transactions: snapshot.transactions,
    sessionId: snapshot.sessionId,
  });
  assert.equal(state.hasUnsavedChanges, true);
  assert.equal(state.transactions[0].Amount, -10);
  assert.equal(state.originalTransactions[0].Amount, -1);
});

test('a late save from a previous file cannot replace the new file baseline', () => {
  const previous = edit(open());
  const next = appReducer(previous, {
    type: 'open',
    session: { fileName: 'other.csv', transactions: [] },
  });
  assert.equal(
    appReducer(next, {
      type: 'save',
      transactions: previous.transactions,
      sessionId: previous.sessionId,
    }),
    next,
  );
});

test('opening and closing reset file-specific state and preserve catalog and read-only setting', () => {
  let state = open(true);
  state = appReducer(state, { type: 'search', value: 'Something' });
  state.analyticsExclusions.categories.add('Bar');
  state = appReducer(state, { type: 'close' });
  assert.equal(state.fileName, '');
  assert.equal(state.viewOnlyMode, true);
  assert.deepEqual(state.categories, { Bar: ['Coffee'], Tools: ['Software'] });
  assert.equal(state.ready, true);
  assert.equal(state.searchQuery, '');
  assert.equal(state.analyticsExclusions.categories.size, 0);
});

test('bulk updates affect only selected rows, infer parents, clear incompatible children and normalize tags', () => {
  let state = appReducer(open(), {
    type: 'upsert',
    rows: [{ ...original, id: 'two' }],
  });
  state = appReducer(state, { type: 'select', ids: ['one'] });
  state = appReducer(state, {
    type: 'bulk',
    field: 'Category',
    value: 'Tools',
  });
  assert.equal(state.transactions[0].Subcategory, '');
  assert.equal(state.transactions[1].Category, 'Bar');
  state = appReducer(state, { type: 'select', ids: ['one'] });
  state = appReducer(state, {
    type: 'bulk',
    field: 'Subcategory',
    value: ['Tools', 'Software'],
  });
  assert.equal(state.transactions[0].Subcategory, 'Software');
  state = appReducer(state, { type: 'select', ids: ['one'] });
  state = appReducer(state, {
    type: 'bulk',
    field: 'Tags',
    value: 'work, work',
  });
  assert.equal(state.transactions[0].Tags, '#work');
  assert.equal(state.transactions[1].Tags, '');
});

test('drilldown return restores text, normalized search and sort while retaining exclusions', () => {
  let state = appReducer(open(), { type: 'search', value: '  COFFEE  ' });
  state = appReducer(state, { type: 'sort', column: 'Amount' });
  state.analyticsExclusions.categories.add('Tools');
  state = appReducer(state, { type: 'drilldown', filter: 'Bar', scrollY: 123 });
  assert.equal(state.tab, 'Transactions');
  assert.equal(state.searchQuery, 'bar');
  assert.equal(state.analyticsReturnContext.scrollY, 123);
  state = appReducer(state, { type: 'search', value: 'temporary' });
  state = appReducer(state, { type: 'tab', tab: 'Analytics' });
  assert.equal(state.searchText, '  COFFEE  ');
  assert.equal(state.searchQuery, 'coffee');
  assert.deepEqual(state.sort, { column: 'Amount', direction: 'desc' });
  assert.equal(state.analyticsReturnContext, null);
  assert(state.analyticsExclusions.categories.has('Tools'));
});

test('opening an existing file always resets to read only and desktop can explicitly unlock', () => {
  let state = open(true);
  assert.equal(state.viewOnlyMode, true);
  state = appReducer(state, { type: 'viewOnly' });
  assert.equal(state.viewOnlyMode, false);
  state = appReducer(state, { type: 'open', session: { fileName: 'next.csv', transactions: [] } });
  assert.equal(state.viewOnlyMode, true);
  state = appReducer(state, { type: 'analyticsPeriod', value: 'current_month' });
  assert.equal(state.analyticsPeriod, 'current_month');
  assert.equal(state.hasUnsavedChanges, false);
});

test('download confirmation acknowledges only its snapshot and does not clear subsequent edits', () => {
  const snapshot = edit(open());
  let state = appReducer(snapshot, { type: 'downloadPending', transactions: snapshot.transactions, sessionId: snapshot.sessionId });
  assert.equal(state.hasUnsavedChanges, true);
  state = appReducer(state, { type: 'upsert', rows: [{ ...original, id: 'later' }] });
  state = appReducer(state, { type: 'save', ...state.pendingDownload });
  assert.equal(state.hasUnsavedChanges, true);
  assert.equal(state.originalTransactions.length, 1);
  assert.equal(state.pendingDownload, null);
  const replaced = appReducer(state, { type: 'open', session: { fileName: 'next.csv', transactions: [] } });
  assert.equal(replaced.pendingDownload, null);
  assert.equal(appReducer(replaced, { type: 'downloadPending', transactions: [], sessionId: snapshot.sessionId }), replaced);
});

test('the built-in demo stays read only and rejects unlock and write actions', () => {
  const state = appReducer(createAppState(), { type: 'open', editable: true, session: { fileName: 'demo.csv', isDemo: true, transactions: [original] } });
  assert.equal(state.viewOnlyMode, true);
  for (const action of [
    { type: 'viewOnly' },
    { type: 'upsert', rows: [{ ...original, id: 'new' }] },
    { type: 'delete', ids: [original.id] },
    { type: 'bulk', field: 'Category', value: 'Other' },
    { type: 'addClassification', category: 'Changed' },
    { type: 'undo' },
    { type: 'selection', value: true },
    { type: 'select', ids: [original.id] },
  ]) assert.equal(appReducer(state, action), state);
  const personal = appReducer(state, { type: 'open', session: { fileName: 'demo.csv', isDemo: false, transactions: [original] } });
  assert.equal(appReducer(personal, { type: 'viewOnly' }).viewOnlyMode, false);
});

test('locked and device-protected sessions reject write actions at the reducer boundary', () => {
  const actions = [
    { type: 'upsert', id: 'one', rows: [{ ...original, NeedWant: 'want' }] },
    { type: 'upsert', rows: [{ ...original, id: 'two' }] },
    { type: 'delete', ids: ['one'] },
    { type: 'bulk', field: 'NeedWant', value: 'need' },
    { type: 'bulk', field: 'Tags', value: '#changed' },
    { type: 'addClassification', category: 'New category' },
    { type: 'undo' }, { type: 'selection' }, { type: 'select', ids: ['one'] },
  ];
  for (const protection of [{viewOnlyMode:true}, {deviceReadOnly:true}]) {
    const state = {...open(), ...protection, selectedIds:['one'], hasUnsavedChanges:true};
    const snapshot=structuredClone(state);
    for (const action of actions) assert.equal(appReducer(state,action),state,action.type);
    assert.deepEqual(state,snapshot);
    assert.equal(appReducer(state,{type:'analyticsPeriod',value:'overall'}).analyticsPeriod,'overall');
  }
  let desktop = appReducer(open(true),{type:'viewOnly'});
  desktop=appReducer(desktop,{type:'select',ids:['one']});
  desktop=appReducer(desktop,{type:'bulk',field:'NeedWant',value:'need'});
  assert.equal(desktop.transactions[0].NeedWant,'need');
});
