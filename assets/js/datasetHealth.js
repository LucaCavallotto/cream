export const HEALTH_CHECKS = {
  missing_date: 'Missing date',
  invalid_date: 'Invalid date',
  missing_amount: 'Missing amount',
  invalid_amount: 'Invalid amount',
  missing_description: 'Missing description',
  missing_category: 'Missing category',
  unknown_category: 'Unknown category',
  missing_subcategory: 'Missing subcategory',
  invalid_subcategory: 'Invalid subcategory',
  uncategorized: 'Uncategorized transaction'
};

export function isValidTransactionDate(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match;
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return !isNaN(calendarDate) && calendarDate.toISOString().slice(0, 10) === `${year}-${month}-${day}` &&
    Number(hour || 0) <= 23 && Number(minute || 0) <= 59 && Number(second || 0) <= 59 &&
    !isNaN(new Date(value));
}

// Preserve invalid source values for review and export instead of replacing them with zero.
export function parseImportedAmount(value) {
  const text = String(value ?? '').trim();
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) && Number.isFinite(Number(text))) {
    return Number(text);
  }
  return value ?? '';
}

export function getTransactionIssues(transaction, categories) {
  const issues = [];
  const add = (code, message = HEALTH_CHECKS[code]) => issues.push({ code, message });
  const empty = value => value == null || String(value).trim() === '';
  if (empty(transaction.DateTime)) add('missing_date');
  else if (!isValidTransactionDate(transaction.DateTime)) add('invalid_date', `Invalid date: ${transaction.DateTime}`);
  if (empty(transaction.Amount)) add('missing_amount');
  else if (!Number.isFinite(transaction.Amount)) add('invalid_amount', `Invalid amount: ${transaction.Amount}`);
  if (empty(transaction.Description)) add('missing_description');

  const category = transaction.Category || '';
  const subcategory = transaction.Subcategory || '';
  const knownCategory = Object.hasOwn(categories, category);
  if (empty(category)) add('missing_category');
  else if (!knownCategory) add('unknown_category', `Category is not in the catalog: ${category}`);
  if (empty(subcategory)) add('missing_subcategory');
  else if (!knownCategory || !categories[category].includes(subcategory)) {
    add('invalid_subcategory', `Subcategory does not belong to a known category: ${subcategory}`);
  }
  if (category.trim().toLowerCase() === 'uncategorized' || subcategory.trim().toLowerCase() === 'uncategorized') {
    add('uncategorized');
  }
  return issues;
}

export function analyzeDataset(transactions, categories) {
  const counts = Object.fromEntries(Object.keys(HEALTH_CHECKS).map(code => [code, 0]));
  const dirty = [];
  transactions.forEach((transaction, index) => {
    const issues = getTransactionIssues(transaction, categories);
    if (issues.length) dirty.push({ transaction, recordNumber: index + 1, issues });
    issues.forEach(issue => counts[issue.code]++);
  });
  return {
    total: transactions.length,
    clean: transactions.length - dirty.length,
    issueCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
    counts,
    dirty
  };
}
