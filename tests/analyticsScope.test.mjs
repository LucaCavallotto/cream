import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createAnalyticsExclusions, isExcludedFromAnalytics, selectAnalyticsTransactions, filterAnalyticsPeriod, buildMonthlyCashFlow, getAnalyticsExclusionOptions, excludeAnalyticsCategory, excludeAllAnalyticsCategories } from '../assets/js/analyticsScope.js';
import { isValidTransactionDate } from '../assets/js/datasetHealth.js';

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
  assert.equal(result[0].expenses, 10);
  assert.equal(result[1].expenses, 0);
  assert.equal(result[1].income, 0);
  assert.equal(result[2].income, 20);
  assert.deepEqual(buildMonthlyCashFlow([]), []);
});

test('analytics renderer consistently excludes investments from every metric and breakdown', () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {}, getContext: () => ({}), closest() { return this; }, querySelector() { return this; }
    });
    return elements.get(id);
  };
  element('analyticsTimePeriod').value = 'current_month';
  const exclusions = createAnalyticsExclusions();
  exclusions.categories.add('Investments');
  const chartData = new Map();
  const captures = {};
  const state = { transactions: structuredClone(transactions), analyticsExclusions: exclusions };
  const snapshot = JSON.stringify(state.transactions);
  class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context = vm.createContext({ state, Date: TestDate, isValidTransactionDate, selectAnalyticsTransactions,
    filterAnalyticsPeriod, buildMonthlyCashFlow, captures, renderAnalyticsFilters() {},
    document: { getElementById: element, querySelector: element },
    Chart: class { constructor(_, config) { chartData.set(config.type, config.data); } destroy() {} }
  });
  const source = readFileSync(new URL('../assets/js/analytics.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  vm.runInContext(source, context);
  vm.runInContext(`renderDetailedCategoryBreakdown = rows => captures.spending = rows;
    renderDetailedIncomeBreakdown = rows => captures.income = rows;
    renderDetailedTagsBreakdown = rows => captures.tags = rows;`, context);
  context.renderAnalytics();
  assert.equal(element('metricIncome').textContent, '€1000.00');
  assert.equal(element('metricExpenses').textContent, '€10.00');
  assert.equal(element('metricDelta').textContent, '+€990.00');
  assert(element('metricCurrentMonth').innerHTML.startsWith('€10.00'));
  assert.equal(element('metricPrevMonth').textContent, '€20.00');
  for (const rows of Object.values(captures)) assert.deepEqual(Array.from(rows, t => t.id), ['salary', 'coffee']);
  assert.deepEqual(Array.from(chartData.get('pie').labels), ['Bar']);
  assert.deepEqual(Array.from(chartData.get('line').datasets[1].data), [10]);
  exclusions.categories.clear();
  context.renderAnalytics();
  assert.equal(element('metricIncome').textContent, '€1025.00');
  assert.equal(element('metricExpenses').textContent, '€510.00');
  assert.equal(element('metricPrevMonth').textContent, '€220.00');
  exclusions.transactions = new Set(transactions.map(t => t.id));
  context.renderAnalytics();
  assert.equal(element('metricIncome').textContent, '€0.00');
  assert.equal(element('metricExpenses').textContent, '€0.00');
  assert.equal(chartData.get('line').labels.length, 0);
  assert.equal(JSON.stringify(state.transactions), snapshot);
  assert.equal(state.hasUnsavedChanges, undefined);
});
