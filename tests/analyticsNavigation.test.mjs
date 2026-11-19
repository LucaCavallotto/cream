import assert from 'node:assert/strict';
import test from 'node:test';
import { beginAnalyticsDrilldown, finishAnalyticsDrilldown } from '../assets/js/analyticsNavigation.js';
import { createAnalyticsExclusions } from '../assets/js/analyticsScope.js';

test('drilldown and return restore search, display text and sort without resetting exclusions or transaction edits', () => {
  const state = { searchQuery: 'coffee', sort: { column: 'Amount', direction: 'asc' },
    analyticsExclusions: createAnalyticsExclusions(), transactions: [{ id: 'test', Amount: -1 }] };
  state.analyticsExclusions.categories.add('Investments');
  const exclusions = state.analyticsExclusions;
  beginAnalyticsDrilldown(state, 'Food & Dining', 'Coffee', 1500);
  assert.equal(state.searchQuery, 'food & dining');
  state.sort.direction = 'desc';
  state.searchQuery = 'restaurant';
  state.transactions[0].Amount = -2;
  const context = finishAnalyticsDrilldown(state);
  assert.equal(state.searchQuery, 'coffee');
  assert.equal(context.searchText, 'Coffee');
  assert.equal(context.scrollY, 1500);
  assert.deepEqual(state.sort, { column: 'Amount', direction: 'asc' });
  assert.equal(state.analyticsExclusions, exclusions);
  assert(exclusions.categories.has('Investments'));
  assert.equal(state.transactions[0].Amount, -2);
  assert.equal(state.analyticsReturnContext, null);
  assert.equal(finishAnalyticsDrilldown(state), null);
});

test('repeated drilldowns retain the original return point and a new round trip captures fresh state', () => {
  const state = { searchQuery: '', sort: { column: 'Date', direction: 'desc' } };
  beginAnalyticsDrilldown(state, 'Bar', '', 0);
  beginAnalyticsDrilldown(state, '#holiday', 'Bar', 300);
  assert.equal(state.searchQuery, '#holiday');
  assert.equal(finishAnalyticsDrilldown(state).scrollY, 0);
  assert.equal(state.searchQuery, '');
  state.searchQuery = 'salary';
  beginAnalyticsDrilldown(state, 'Income', 'Salary', 900);
  assert.equal(finishAnalyticsDrilldown(state).searchText, 'Salary');
  assert.equal(state.searchQuery, 'salary');
});

test('structured drilldown distinguishes Other parents, signs, tags, period and exclusions', async () => {
  const { drilldownTransactions } = await import('../assets/js/analyticsNavigation.js');
  const rows = [
    { id: 'one', Category: 'Shopping', Subcategory: 'Other', Amount: -5, DateTime: '2026-11-02', Tags: '#work' },
    { id: 'two', Category: 'Other', Subcategory: 'Other', Amount: -10, DateTime: '2026-11-02', Tags: '#worker' },
    { id: 'three', Category: 'Shopping', Subcategory: 'Other', Amount: 5, DateTime: '2026-11-02', Tags: '#work' },
    { id: 'four', Category: 'Shopping', Subcategory: 'Other', Amount: -20, DateTime: '2025-11-02', Tags: '' },
  ];
  const exclusions = createAnalyticsExclusions();
  const scope = { kind: 'expenses', category: 'Shopping', subcategory: 'Other', period: 'specific_month', month: '2026-11', now: '2026-11-18' };
  assert.deepEqual(drilldownTransactions(rows, exclusions, scope).map(t => t.id), ['one']);
  assert.deepEqual(drilldownTransactions(rows, exclusions, { ...scope, kind: 'tags', tag: '#work' }).map(t => t.id), ['one', 'three']);
  exclusions.transactions.add('one');
  assert.deepEqual(drilldownTransactions(rows, exclusions, scope), []);
});
