import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTransactionFilters,
  matchesTransactionFilters,
} from '../assets/js/transactionFilters.js';
import { createAppState, appReducer } from '../assets/js/appState.js';
const row = {
  Category: 'Travel',
  Subcategory: 'Transport',
  Amount: -10,
  DateTime: '2026-11-02T12:00:00+01:00',
};
const matches = (changes) =>
  matchesTransactionFilters(row, { ...createTransactionFilters(), ...changes });

test('ledger filters compose without conflating subcategories with identical labels', () => {
  assert(matches({ category: JSON.stringify('Travel'), type: 'expense' }));
  assert(!matches({ type: 'income' }));
  assert(matches({ subcategory: JSON.stringify(['Travel', 'Transport']) }));
  assert(!matches({ subcategory: JSON.stringify(['Other', 'Transport']) }));
  assert(
    matchesTransactionFilters(
      { ...row, Amount: 0 },
      { ...createTransactionFilters(), type: 'zero' },
    ),
  );
  assert(
    !matchesTransactionFilters(
      { ...row, Amount: 'bad' },
      { ...createTransactionFilters(), type: 'expense' },
    ),
  );
});

test('date bounds include the complete local day and invalid dates require an unbounded filter', () => {
  assert(matches({ from: '2026-11-02', to: '2026-11-02' }));
  assert(!matches({ from: '2026-11-03' }));
  assert(!matches({ to: '2026-11-01' }));
  assert(
    !matchesTransactionFilters(
      { ...row, DateTime: 'bad' },
      { ...createTransactionFilters(), from: '2026-01-01' },
    ),
  );
  assert(
    matchesTransactionFilters(
      { ...row, DateTime: 'bad' },
      createTransactionFilters(),
    ),
  );
});

test('drilldowns clear ledger filters temporarily, restore them on return and never dirty CSV data', () => {
  let state = createAppState();
  state = appReducer(state, {
    type: 'transactionFilters',
    value: { ...state.transactionFilters, type: 'income' },
  });
  state = appReducer(state, { type: 'drilldown', filter: 'Bar', scrollY: 80 });
  assert.equal(state.transactionFilters.type, '');
  state = appReducer(state, { type: 'tab', tab: 'Analytics' });
  assert.equal(state.transactionFilters.type, 'income');
  assert.equal(state.hasUnsavedChanges, false);
  state = appReducer(state, { type: 'clearTransactionFilters' });
  assert.deepEqual(state.transactionFilters, createTransactionFilters());
});

test('Need/Want filtering distinguishes legacy blanks and composes with other filters', () => {
  const filters = {...createTransactionFilters(), needWant:'unclassified'};
  for (const NeedWant of [undefined, '', null]) assert(matchesTransactionFilters({...row,NeedWant},filters));
  for (const NeedWant of ['need','want']) {
    assert(!matchesTransactionFilters({...row,NeedWant},filters));
    assert(matchesTransactionFilters({...row,NeedWant},{...filters,needWant:NeedWant,type:'expense',category:JSON.stringify('Travel'),from:'2026-11-01'}));
    assert(!matchesTransactionFilters({...row,NeedWant},{...filters,needWant:NeedWant,type:'income'}));
    assert(matchesTransactionFilters({...row,NeedWant},createTransactionFilters()));
  }
});

test('Need/Want filters survive navigation and drilldown, clear and reset with the file session', () => {
  let state=appReducer(createAppState(),{type:'transactionFilters',value:{...createTransactionFilters(),needWant:'unclassified'}});
  state=appReducer(state,{type:'tab',tab:'Overview'});
  assert.equal(state.transactionFilters.needWant,'unclassified');
  state=appReducer(state,{type:'drilldown',filter:'Bar',scrollY:0});
  assert.equal(state.transactionFilters.needWant,'');
  state=appReducer(state,{type:'tab',tab:'Analytics'});
  assert.equal(state.transactionFilters.needWant,'unclassified');
  assert.equal(state.hasUnsavedChanges,false);
  assert.equal(appReducer(state,{type:'clearTransactionFilters'}).transactionFilters.needWant,'');
  assert.equal(appReducer(state,{type:'open',session:{fileName:'next.csv',transactions:[]}}).transactionFilters.needWant,'');
  assert.equal(appReducer(state,{type:'close'}).transactionFilters.needWant,'');
});
