import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalyticsExclusions, isExcludedFromAnalytics, selectAnalyticsTransactions, filterAnalyticsPeriod, buildMonthlyCashFlow, getAnalyticsExclusionOptions, excludeAnalyticsCategory, excludeAllAnalyticsCategories } from '../assets/js/analyticsScope.js';
import { analyticsModel, chartConfig } from '../assets/js/analyticsModel.js';

const make = (id, Amount, Category, Subcategory, DateTime = '2026-11-02T12:00:00+01:00') =>
  ({ id, Amount, Category, Subcategory, DateTime, Description: id, Tags: '#example', Notes: '' });
const transactions = [
  make('salary', 1000, 'Income', 'Salary'), make('etf', -500, 'Investments', 'ETFs'),
  make('dividend', 25, 'Investments', 'Interests & Dividends'), make('coffee', -10, 'Bar', 'Coffee'),
  make('october', -20, 'Bar', 'Coffee', '2026-10-02T12:00:00+02:00'),
  make('october-etf', -200, 'Investments', 'ETFs', '2026-10-02T12:00:00+02:00')
];
const now = new Date('2026-11-18T12:00:00+01:00');

test('all valid transactions start included and exclusions never mutate the source', () => {
  const snapshot = JSON.stringify(transactions);
  const exclusions = createAnalyticsExclusions();
  assert.equal(selectAnalyticsTransactions(transactions, exclusions).included.length, transactions.length);
  exclusions.categories.add('Investments');
  const { included, excluded } = selectAnalyticsTransactions(transactions, exclusions);
  assert.deepEqual(excluded.map(t => t.id), ['etf', 'dividend', 'october-etf']);
  assert.equal(included.length, 3);
  assert.equal(JSON.stringify(transactions), snapshot);
  exclusions.categories.delete('Investments');
  assert.equal(selectAnalyticsTransactions(transactions, exclusions).included.length, transactions.length);
});

test('subcategory exclusions distinguish identical names under different parents', () => {
  const exclusions = createAnalyticsExclusions();
  exclusions.subcategories.add(JSON.stringify(['Bills', 'Subscriptions']));
  assert(isExcludedFromAnalytics(make('cloud', -3, 'Bills', 'Subscriptions'), exclusions));
  assert(!isExcludedFromAnalytics(make('streaming', -10, 'Entertainment', 'Subscriptions'), exclusions));
  exclusions.subcategories.clear();
  exclusions.subcategories.add(JSON.stringify(['Investments', 'ETFs']));
  assert.deepEqual(selectAnalyticsTransactions(transactions, exclusions).excluded.map(t => t.id), ['etf', 'october-etf']);
});

test('individual rules use transaction identity and overlapping exclusions count only once', () => {
  const exclusions = createAnalyticsExclusions();
  exclusions.transactions.add('etf');
  exclusions.categories.add('Investments');
  exclusions.subcategories.add(JSON.stringify(['Investments', 'ETFs']));
  assert.equal(selectAnalyticsTransactions(transactions, exclusions).excluded.length, 3);
  exclusions.categories.clear();
  exclusions.subcategories.clear();
  assert.deepEqual(selectAnalyticsTransactions(transactions, exclusions).excluded.map(t => t.id), ['etf']);
  exclusions.transactions.clear();
  assert.equal(selectAnalyticsTransactions(transactions, exclusions).excluded.length, 0);
});

test('dropdown choices omit excluded categories and subcategories and restore removed rules', () => {
  const exclusions = createAnalyticsExclusions();
  exclusions.categories.add('Bar');
  const etfKey = JSON.stringify(['Investments', 'ETFs']);
  exclusions.subcategories.add(etfKey);
  let options = getAnalyticsExclusionOptions(transactions, exclusions);
  assert(!options.has('Bar'));
  assert.deepEqual([...options.get('Investments')], ['Interests & Dividends']);
  exclusions.subcategories.add(JSON.stringify(['Investments', 'Interests & Dividends']));
  assert(!getAnalyticsExclusionOptions(transactions, exclusions).has('Investments'));
  exclusions.categories.delete('Bar');
  exclusions.subcategories.delete(etfKey);
  options = getAnalyticsExclusionOptions(transactions, exclusions);
  assert(options.has('Bar'));
  assert(options.get('Investments').has('ETFs'));
});

test('a whole-category rule replaces only its own subcategory rules', () => {
  const exclusions = createAnalyticsExclusions();
  const other = JSON.stringify(['Bar', 'Coffee']);
  exclusions.subcategories.add(JSON.stringify(['Investments', 'ETFs']));
  exclusions.subcategories.add(other);
  excludeAnalyticsCategory(exclusions, 'Investments');
  excludeAnalyticsCategory(exclusions, 'Investments');
  assert.equal(exclusions.categories.size, 1);
  assert.deepEqual([...exclusions.subcategories], [other]);
  exclusions.categories.delete('Investments');
  assert(!isExcludedFromAnalytics(transactions[1], exclusions));
});

test('Exclude all supports selecting a few categories back without residual narrow rules', () => {
  const rows = [...transactions, make('uncategorized', -1, '', '')];
  const exclusions = excludeAllAnalyticsCategories(rows);
  assert.equal(selectAnalyticsTransactions(rows, exclusions).included.length, 0);
  assert.equal(exclusions.categories.size, 4);
  assert.equal(exclusions.subcategories.size, 0);
  assert.equal(exclusions.transactions.size, 0);
  assert.equal(getAnalyticsExclusionOptions(rows, exclusions).size, 0);
  exclusions.categories.delete('Bar');
  const selected = selectAnalyticsTransactions(rows, exclusions);
  assert.deepEqual(selected.included.map(t => t.id), ['coffee', 'october']);
  assert.deepEqual([...getAnalyticsExclusionOptions(rows, exclusions).keys()], ['Bar']);
  exclusions.categories.delete('');
  assert(selectAnalyticsTransactions(rows, exclusions).included.some(t => t.id === 'uncategorized'));
});

test('invalid values remain excluded for data health reasons after Include all', () => {
  const rows = [...transactions, make('bad-amount', '', 'Bar', 'Coffee'), make('bad-date', -3, 'Bar', 'Coffee', '2026-02-30')];
  const result = selectAnalyticsTransactions(rows, createAnalyticsExclusions());
  assert.equal(result.invalidCount, 2);
  assert.equal(result.excluded.length, 0);
  assert.equal(result.included.length, transactions.length);
});

test('period filters and empty selections apply after exclusions', () => {
  const exclusions = createAnalyticsExclusions();
  exclusions.categories.add('Investments');
  const { included } = selectAnalyticsTransactions(transactions, exclusions);
  assert.deepEqual(filterAnalyticsPeriod(included, 'current_month', '', now).map(t => t.id), ['salary', 'coffee']);
  assert.deepEqual(filterAnalyticsPeriod(included, 'specific_month', '2026-10', now).map(t => t.id), ['october']);
  assert.equal(filterAnalyticsPeriod(included, 'specific_month', '2025-01', now).length, 0);
  assert.equal(filterAnalyticsPeriod(included, 'last_3_months', '', now).length, 3);
  assert.deepEqual(filterAnalyticsPeriod([], 'overall', '', now), []);
});

test('monthly cash flow spans the selected data and fills missing months with zero', () => {
  const rows = [make('jan', -10, 'Bar', 'Coffee', '2025-01-15T12:00:00Z'), make('march', 20, 'Income', 'Salary', '2025-03-15T12:00:00Z')];
  const result = buildMonthlyCashFlow(rows);
  assert.deepEqual(result.map(m => m.key), ['2025-01', '2025-02', '2025-03']);
  assert.deepEqual(result.map(m => m.label), ['Jan 2025', 'Feb 2025', 'Mar 2025']);
  assert.equal(result[0].expenses, 10);
  assert.equal(result[1].expenses, 0);
  assert.equal(result[1].income, 0);
  assert.equal(result[2].income, 20);
  assert.deepEqual(buildMonthlyCashFlow([]), []);
});

test('analytics model consistently excludes investments from every metric, chart and breakdown', () => {
  const exclusions = createAnalyticsExclusions();
  exclusions.categories.add('Investments');
  const snapshot = JSON.stringify(transactions);
  const model = analyticsModel(transactions, exclusions, 'current_month', '', now);
  assert.equal(model.income, 1000);
  assert.equal(model.expenses, 10);
  assert.equal(model.net, 990);
  assert.equal(model.current, 10);
  assert.equal(model.previous, 20);
  assert.deepEqual(model.rows.map(t => t.id), ['salary', 'coffee']);
  assert.deepEqual(model.spending.map(g => g.name), ['Bar']);
  assert.deepEqual(model.incomeGroups.map(g => g.name), ['Income']);
  assert.equal(model.tags[0].total, 990);
  assert.equal(model.tags[0].volume, 1010);
  const pie = chartConfig('pie', model), line = chartConfig('line', model);
  assert.deepEqual(pie.data.labels, ['Bar']);
  assert.deepEqual(line.data.datasets[1].data, [10]);
  assert.equal(line.options.locale, 'en-GB');
  assert.equal(pie.options.locale, 'en-GB');
  assert.equal(model.periodLabel, 'November 2026');
  exclusions.categories.clear();
  const restored = analyticsModel(transactions, exclusions, 'current_month', '', now);
  assert.equal(restored.income, 1025);
  assert.equal(restored.expenses, 510);
  assert.equal(restored.previous, 220);
  exclusions.transactions = new Set(transactions.map(t => t.id));
  const empty = analyticsModel(transactions, exclusions, 'overall', '', now);
  assert.equal(empty.income, 0);
  assert.equal(empty.expenses, 0);
  assert.equal(chartConfig('line', empty).data.labels.length, 0);
  assert.equal(JSON.stringify(transactions), snapshot);
});

test('tag expense categories use gross spending, selected period and all exclusion types', () => {
  const rows = [
    make('coffee', -10, 'Bar', 'Coffee'), make('lunch', -20, 'Food & Dining', 'Restaurant'),
    make('refund', 5, 'Bar', 'Coffee'), make('missing', -3, '', ''),
    make('older', -40, 'Travel', 'Transport', '2026-10-01'),
    make('zero', 0, 'Zero', ''), make('invalid', NaN, 'Broken', ''),
    { ...make('multi', -2, 'Bar', 'Coffee'), Tags: '#example #shared' },
    { ...make('income-only', 100, 'Income', 'Salary'), Tags: '#income' },
    { ...make('untagged', -50, 'Other', ''), Tags: '' },
  ];
  const snapshot = JSON.stringify(rows);
  const exclusions = createAnalyticsExclusions();
  const model = () => analyticsModel(rows, exclusions, 'current_month', '', now);
  const find = name => model().tags.find(tag => tag.name === name);
  assert.deepEqual(find('#example').spending, [['Food & Dining', 20], ['Bar', 12], ['Uncategorized', 3]]);
  assert.equal(find('#example').expenses, 35);
  assert.equal(find('#example').total, -30);
  assert.deepEqual(find('#shared').spending, [['Bar', 2]]);
  assert.deepEqual(find('#income').spending, []);
  exclusions.categories.add('Food & Dining');
  exclusions.transactions.add('missing');
  assert.deepEqual(find('#example').spending, [['Bar', 12]]);
  exclusions.subcategories.add(JSON.stringify(['Bar', 'Coffee']));
  assert.equal(find('#example').expenses, 0);
  assert.deepEqual(find('#example').spending, []);
  assert.equal(JSON.stringify(rows), snapshot);
});
