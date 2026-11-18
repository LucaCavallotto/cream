import { isValidTransactionDate } from './datasetHealth.js';

export function createAnalyticsExclusions() {
  return { categories: new Set(), subcategories: new Set(), transactions: new Set() };
}

export function getAnalyticsExclusionOptions(transactions, exclusions) {
  const groups = new Map();
  transactions.forEach(t => {
    const category = t.Category || '';
    const subcategory = t.Subcategory || '';
    if (exclusions.categories.has(category) ||
        exclusions.subcategories.has(JSON.stringify([category, subcategory]))) return;
    if (!groups.has(category)) groups.set(category, new Set());
    groups.get(category).add(subcategory);
  });
  return groups;
}

export function excludeAnalyticsCategory(exclusions, category) {
  exclusions.categories.add(category);
  // A whole-category rule replaces narrower rules for the same category.
  exclusions.subcategories.forEach(key => {
    if (JSON.parse(key)[0] === category) exclusions.subcategories.delete(key);
  });
}

export function excludeAllAnalyticsCategories(transactions) {
  const exclusions = createAnalyticsExclusions();
  transactions.forEach(t => exclusions.categories.add(t.Category || ''));
  return exclusions;
}

export function isExcludedFromAnalytics(transaction, exclusions) {
  return exclusions.categories.has(transaction.Category || '') ||
    exclusions.subcategories.has(JSON.stringify([transaction.Category || '', transaction.Subcategory || ''])) ||
    exclusions.transactions.has(transaction.id);
}

export function selectAnalyticsTransactions(transactions, exclusions) {
  const valid = transactions.filter(t => Number.isFinite(t.Amount) && isValidTransactionDate(t.DateTime));
  return {
    included: valid.filter(t => !isExcludedFromAnalytics(t, exclusions)),
    excluded: valid.filter(t => isExcludedFromAnalytics(t, exclusions)),
    invalidCount: transactions.length - valid.length
  };
}

export function filterAnalyticsPeriod(transactions, period, specificMonth, now = new Date()) {
  if (period === 'overall') return transactions;
  return transactions.filter(t => {
    const date = new Date(t.DateTime);
    if (period === 'current_month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === 'specific_month') {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === specificMonth;
    }
    const months = { last_3_months: 3, last_6_months: 6, last_12_months: 12 }[period];
    if (!months) return true;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return date >= cutoff;
  });
}

export function buildMonthlyCashFlow(transactions) {
  const months = new Map();
  transactions.forEach(t => {
    const date = new Date(t.DateTime);
    const key = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, { key, income: 0, expenses: 0 });
    const month = months.get(key);
    if (t.Amount >= 0) month.income += t.Amount;
    else month.expenses += Math.abs(t.Amount);
  });
  const keys = [...months.keys()].sort();
  if (!keys.length) return [];
  const cursor = new Date(`${keys[0]}-01T12:00:00`);
  const end = new Date(`${keys.at(-1)}-01T12:00:00`);
  const result = [];
  while (cursor <= end) {
    const key = `${String(cursor.getFullYear()).padStart(4, '0')}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    result.push({ ...(months.get(key) || { key, income: 0, expenses: 0 }),
      label: cursor.toLocaleString('en-GB', { month: 'short', year: 'numeric' }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}
