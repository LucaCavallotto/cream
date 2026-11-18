import assert from 'node:assert/strict';
import test from 'node:test';
import {
  datasetTicker,
  formatMoney,
  overviewModel,
} from '../assets/js/presentation.js';
import { chartConfig } from '../assets/js/analyticsModel.js';
import { createAnalyticsExclusions } from '../assets/js/analyticsScope.js';

const now = new Date('2026-11-18T12:00:00+01:00');
const row = (id, Amount, Category = 'Bar') => ({
  id,
  Amount,
  Category,
  Subcategory: '',
  DateTime: '2026-11-02T12:00:00+01:00',
  Description: id,
  Tags: '',
  Notes: '',
});

test('money presentation preserves signs, zero, decimals and English grouping', () => {
  assert.equal(formatMoney(1234.5), '€1,234.50');
  assert.equal(formatMoney(1234.5, true), '+€1,234.50');
  assert.equal(formatMoney(-5.4), '−€5.40');
  assert.equal(formatMoney(0, true), '€0.00');
  assert.equal(formatMoney(-0, true), '€0.00');
});

test('overview and ticker share analytics exclusions and omit invalid source values without changing the dataset', () => {
  const rows = [
    row('salary', 1000, 'Income'),
    row('coffee', -10),
    row('etf', -500, 'Investments'),
    row('invalid', 'bad'),
  ];
  const before = structuredClone(rows),
    exclusions = createAnalyticsExclusions();
  exclusions.categories.add('Investments');
  const model = overviewModel(rows, exclusions, now);
  assert.equal(model.net, 990);
  assert.equal(model.expenses, 10);
  const items = datasetTicker(model);
  assert.equal(items.find((item) => item.key === 'net').value, '+€990.00');
  assert.equal(
    items.find((item) => item.key === 'records').value,
    '2 transactions',
  );
  assert.equal(
    items.find((item) => item.key === 'excluded').value,
    '1 transaction',
  );
  assert.equal(items.find((item) => item.key === 'invalid').value, '1 record');
  assert(!items.some((item) => item.label === 'INVESTMENTS'));
  assert.deepEqual(rows, before);
});

test('ticker distinguishes negative and zero flow and limits the category strip to the biggest spenders', () => {
  const model = overviewModel(
    Array.from({ length: 7 }, (_, i) =>
      row(`expense${i}`, -(i + 1), `Category ${i}`),
    ),
    createAnalyticsExclusions(),
    now,
  );
  const items = datasetTicker(model);
  assert.equal(items.find((item) => item.key === 'net').tone, 'negative');
  assert.deepEqual(
    items
      .filter((item) => item.key.startsWith('category:'))
      .map((item) => item.label),
    ['CATEGORY 6', 'CATEGORY 5', 'CATEGORY 4', 'CATEGORY 3'],
  );
  const empty = datasetTicker(
    overviewModel([], createAnalyticsExclusions(), now),
  );
  assert.equal(empty.find((item) => item.key === 'net').tone, 'neutral');
  assert.equal(empty.find((item) => item.key === 'income').tone, 'neutral');
  assert.equal(empty.find((item) => item.key === 'expenses').value, '€0.00');
});

test('charts follow the system palette and reduced-motion setting without changing the financial series', () => {
  const model = overviewModel(
    [row('salary', 1000, 'Income'), row('coffee', -10)],
    createAnalyticsExclusions(),
    now,
  );
  const light = chartConfig('line', model),
    dark = chartConfig('line', model, { dark: true, reducedMotion: true });
  assert.equal(dark.options.animation, false);
  assert.notEqual(light.options.color, dark.options.color);
  assert.notEqual(
    light.options.scales.y.grid.color,
    dark.options.scales.y.grid.color,
  );
  assert.notEqual(
    light.data.datasets[0].borderColor,
    dark.data.datasets[0].borderColor,
  );
  assert.deepEqual(
    light.data.datasets.map((dataset) => dataset.data),
    dark.data.datasets.map((dataset) => dataset.data),
  );
  assert.equal(dark.options.locale, 'en-GB');
});
