import { analyticsModel } from './analyticsModel.js';

const currency = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
export function formatMoney(value, signed = false) {
  return `${signed && value > 0 ? '+' : value < 0 ? '−' : ''}${currency.format(Math.abs(value))}`;
}

// The ticker uses the same validated, excluded scope as analytics, not market prices.
export function datasetTicker(model) {
  const items = [
    {
      key: 'net',
      label: 'NET FLOW',
      value: formatMoney(model.net, true),
      tone: model.net < 0 ? 'negative' : model.net > 0 ? 'positive' : 'neutral',
    },
    {
      key: 'income',
      label: 'INCOME',
      value: formatMoney(model.income),
      tone: model.income > 0 ? 'positive' : 'neutral',
    },
    {
      key: 'expenses',
      label: 'EXPENSES',
      value: formatMoney(model.expenses),
      tone: model.expenses > 0 ? 'negative' : 'neutral',
    },
    {
      key: 'records',
      label: 'INCLUDED',
      value: `${model.rows.length} transaction${model.rows.length === 1 ? '' : 's'}`,
      tone: 'neutral',
    },
  ];
  model.spending
    .slice(0, 4)
    .forEach((group) =>
      items.push({
        key: `category:${group.name}`,
        label: group.name.toUpperCase(),
        value: formatMoney(group.total),
        tone: 'neutral',
      }),
    );
  if (model.selection.excluded.length)
    items.push({
      key: 'excluded',
      label: 'EXCLUDED',
      value: `${model.selection.excluded.length} transaction${model.selection.excluded.length === 1 ? '' : 's'}`,
      tone: 'neutral',
    });
  if (model.selection.invalidCount)
    items.push({
      key: 'invalid',
      label: 'NEEDS REPAIR',
      value: `${model.selection.invalidCount} record${model.selection.invalidCount === 1 ? '' : 's'}`,
      tone: 'neutral',
    });
  return items;
}

export function overviewModel(transactions, exclusions, now = new Date()) {
  return analyticsModel(transactions, exclusions, 'overall', '', now);
}
