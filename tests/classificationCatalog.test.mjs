import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, existingClassification, similarClassification } from '../assets/js/classificationCatalog.js';
import { appReducer, createAppState } from '../assets/js/appState.js';
test('hybrid catalog preserves imported spelling, extends known parents and handles special keys safely', () => {
  const base = { Bar: ['Coffee'] };
  const catalog = buildCatalog(base, [{ Category: 'Bar', Subcategory: 'Cake' }, { Category: '__proto__', Subcategory: 'Custom' }]);
  assert.deepEqual(catalog.Bar, ['Coffee', 'Cake']);
  assert.deepEqual(catalog.__proto__, ['Custom']);
  assert.deepEqual(base.Bar, ['Coffee']);
  assert.equal(existingClassification('  cOFFEE ', catalog.Bar), 'Coffee');
  assert.equal(similarClassification('Coffe', catalog.Bar), 'Coffee');
  assert.equal(similarClassification('Car', ['Bar']), undefined);
});
test('custom catalog is rebuilt on file replacement and unused additions never enter transactions', () => {
  let state = appReducer(createAppState(), { type: 'categories', categories: { Bar: ['Coffee'] } });
  state = appReducer(state, { type: 'open', editable: true, session: { fileName: 'first.csv', transactions: [{ Category: 'Legacy', Subcategory: 'Old' }] } });
  assert.deepEqual(state.categories.Legacy, ['Old']);
  state = appReducer(state, { type: 'addClassification', category: 'Hobbies', subcategory: 'Crafts' });
  assert.equal(state.transactions.length, 1);
  assert.equal(state.hasUnsavedChanges, false);
  state = appReducer(state, { type: 'open', session: { fileName: 'second.csv', transactions: [] } });
  assert.deepEqual(state.categories, { Bar: ['Coffee'] });
});
