import {
  buildMonthlyCashFlow,
  filterAnalyticsPeriod,
  selectAnalyticsTransactions,
} from './analyticsScope.js';

export function analyticsModel(
  transactions,
  exclusions,
  period,
  month,
  now = new Date(),
) {
  const selection = selectAnalyticsTransactions(transactions, exclusions);
  const rows = filterAnalyticsPeriod(selection.included, period, month, now);
  const excluded = filterAnalyticsPeriod(
    selection.excluded,
    period,
    month,
    now,
  );
  const totals = rows.reduce(
    (sum, t) => ({
      income: sum.income + (t.Amount >= 0 ? t.Amount : 0),
      expenses: sum.expenses + (t.Amount < 0 ? -t.Amount : 0),
    }),
    { income: 0, expenses: 0 },
  );
  const grouped = (kind) => {
    const groups = new Map();
    rows
      .filter((t) => (kind === 'income' ? t.Amount > 0 : t.Amount < 0))
      .forEach((t) => {
        const name = t.Category || 'Uncategorized';
        if (!groups.has(name))
          groups.set(name, { name, total: 0, subcategories: new Map() });
        const group = groups.get(name),
          sub = t.Subcategory || '(No Subcategory)';
        group.total += Math.abs(t.Amount);
        group.subcategories.set(
          sub,
          (group.subcategories.get(sub) || 0) + Math.abs(t.Amount),
        );
      });
    return [...groups.values()]
      .sort((a, b) => b.total - a.total)
      .map((g) => ({
        ...g,
        subcategories: [...g.subcategories].sort((a, b) => b[1] - a[1]),
      }));
  };
  const tags = new Map();
  rows.forEach((t) =>
    (t.Tags || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((name) => {
        if (!tags.has(name))
          tags.set(name, { name, total: 0, income: 0, expenses: 0, volume: 0 });
        const tag = tags.get(name);
        tag.total += t.Amount;
        tag.volume += Math.abs(t.Amount);
        if (t.Amount > 0) tag.income += t.Amount;
        else tag.expenses += Math.abs(t.Amount);
      }),
  );
  const current = filterAnalyticsPeriod(
    selection.included,
    'current_month',
    '',
    now,
  )
    .filter((t) => t.Amount < 0)
    .reduce((sum, t) => sum - t.Amount, 0);
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
  const previous = filterAnalyticsPeriod(
    selection.included,
    'specific_month',
    previousKey,
    now,
  )
    .filter((t) => t.Amount < 0)
    .reduce((sum, t) => sum - t.Amount, 0);
  let periodLabel = 'Overall';
  if (period === 'current_month')
    periodLabel = now.toLocaleString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  else if (period === 'specific_month')
    periodLabel = month
      ? new Date(`${month}-01T12:00:00`).toLocaleString('en-GB', {
          month: 'long',
          year: 'numeric',
        })
      : 'Specific Month';
  else if (period !== 'overall')
    periodLabel = `Last ${{ last_3_months: 3, last_6_months: 6, last_12_months: 12 }[period]} Months`;
  const pie = new Map();
  rows
    .filter((t) => t.Amount < 0 && t.Category?.trim())
    .forEach((t) => pie.set(t.Category, (pie.get(t.Category) || 0) - t.Amount));
  return {
    selection,
    rows,
    excluded,
    ...totals,
    net: totals.income - totals.expenses,
    spending: grouped('expenses'),
    incomeGroups: grouped('income'),
    pie: [...pie].sort((a, b) => b[1] - a[1]).slice(0, 5),
    tags: [...tags.values()].sort((a, b) => b.volume - a.volume),
    monthly: buildMonthlyCashFlow(rows),
    current,
    previous,
    percent:
      previous > 0
        ? ((current - previous) / previous) * 100
        : current > 0
          ? 100
          : 0,
    periodLabel,
  };
}

export function chartConfig(type, model) {
  return {
    type,
    data:
      type === 'pie'
        ? {
            labels: model.pie.map(([name]) => name),
            datasets: [
              {
                data: model.pie.map(([, total]) => total),
                backgroundColor: model.pie.map(
                  (_, i) => `hsl(${(i * 137.508) % 360}, 60%, 50%)`,
                ),
                borderWidth: 1,
                borderColor: '#ffffff',
              },
            ],
          }
        : {
            labels: model.monthly.map((m) => m.label),
            datasets: [
              {
                label: 'Total Income',
                data: model.monthly.map((m) => m.income),
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#28a745',
              },
              {
                label: 'Total Expenses',
                data: model.monthly.map((m) => m.expenses),
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#dc3545',
              },
            ],
          },
    options: {
      locale: 'en-GB',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: type === 'pie' ? 'right' : 'top' },
        tooltip: {
          callbacks: {
            label: (context) =>
              type === 'pie'
                ? ` ${context.label}: €${Number(context.raw).toFixed(2)} (${((context.raw / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
                : ` ${context.dataset.label}: €${Number(context.raw).toFixed(2)}`,
          },
        },
      },
      ...(type === 'line'
        ? {
            interaction: { mode: 'index', intersect: false },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } },
            },
          }
        : {}),
    },
  };
}
