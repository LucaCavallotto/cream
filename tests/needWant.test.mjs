import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { needWantSummary } from '../assets/js/needWant.js';
import { parseTransactionsCSV, serializeTransactionsCSV, CSV_HEADERS } from '../assets/js/csv.js';

test('legacy CSV imports blank classification and exports eight columns without losing fields', () => {
  const old = 'DateTime,Amount,Description,Category,Subcategory,Tags,Notes\n2026-11-01,-5,Coffee,Bar,Coffee,,Keep me';
  const imported = parseTransactionsCSV(old, Papa);
  assert.deepEqual(imported.errors, []);
  assert.equal(imported.transactions[0].NeedWant, '');
  for (const NeedWant of ['', 'need', 'want']) {
    const row = {...imported.transactions[0], NeedWant};
    const saved = serializeTransactionsCSV([row], Papa);
    assert.equal(saved.split('\r\n')[0], CSV_HEADERS.join(','));
    assert.deepEqual(parseTransactionsCSV(saved,Papa).transactions,[row]);
  }
  const invalid = old.replace('Notes\n','Notes,NeedWant\n')+',maybe';
  assert(parseTransactionsCSV(invalid,Papa).errors.length);
});
test('need/want totals cover expenses only and empty data has finite percentages', () => {
  const groups = needWantSummary([{Amount:-10,NeedWant:'need'},{Amount:-20,NeedWant:'want'},{Amount:-30},{Amount:100,NeedWant:'need'},{Amount:NaN},{Amount:0}]);
  assert.deepEqual(groups.map(g=>g.amount),[30,10,20]);
  assert.equal(groups.reduce((sum,g)=>sum+g.amount,0),60);
  assert(needWantSummary([]).every(g=>g.percent===0));
});

import { appReducer, createAppState } from '../assets/js/appState.js';
test('bulk need/want modifies selected records only and can clear the field', () => {
  let state={...createAppState(),transactions:[{id:'a',NeedWant:'need'},{id:'b',NeedWant:'want'}],selectedIds:['a']};
  state=appReducer(state,{type:'bulk',field:'NeedWant',value:''});
  assert.equal(state.transactions[0].NeedWant,'');
  assert.equal(state.transactions[1].NeedWant,'want');
  assert(appReducer({...state,viewOnlyMode:true,selectedIds:['a']},{type:'bulk',field:'NeedWant',value:'need'}).transactions[0].NeedWant==='');
});
