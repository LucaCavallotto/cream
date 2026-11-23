export function needWantSummary(rows) {
  const totals = { unclassified: 0, need: 0, want: 0 };
  for (const row of rows) {
    if (!Number.isFinite(row.Amount) || row.Amount >= 0) continue;
    const key = ['need', 'want'].includes(row.NeedWant) ? row.NeedWant : 'unclassified';
    totals[key] -= row.Amount;
  }
  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  return Object.entries(totals).map(([key, amount]) => ({ key, label: key === 'unclassified' ? 'Not classified' : key === 'need' ? 'Need' : 'Want', amount, percent: total ? amount / total * 100 : 0 }));
}
