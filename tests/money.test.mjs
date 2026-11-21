import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMoney, spacedMoney } from '../assets/js/money.js';
import { chartConfig } from '../assets/js/analyticsModel.js';

test('spaced currency text separates signs and euro without changing numeric formatting', () => {
  assert.equal(spacedMoney(-1234.5), '−\u202f€\u202f1,234.50');
  assert.equal(spacedMoney(2, true), '+\u202f€\u202f2.00');
  assert.equal(spacedMoney(0, true), '€\u202f0.00');
  assert.equal(formatMoney(-1234.5), '−€1,234.50');
});
test('chart tooltip currency uses the same spaced text', () => {
  const model = { periodLabel: 'Overall', monthly: [], pie: [] };
  const callback = chartConfig('line', model).options.plugins.tooltip.callbacks.label;
  assert.equal(callback({ raw: -12.5, dataset: { label: 'Total Expenses' } }), ' Total Expenses: −\u202f€\u202f12.50');
});
