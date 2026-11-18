import { isValidTransactionDate } from './datasetHealth.js';

export function createTransactionFilters() {
  return { category: '', subcategory: '', from: '', to: '', type: '' };
}

export function matchesTransactionFilters(transaction, filters) {
  if (filters.category && transaction.Category !== JSON.parse(filters.category))
    return false;
  if (
    filters.subcategory &&
    JSON.stringify([transaction.Category, transaction.Subcategory]) !==
      filters.subcategory
  )
    return false;
  if (
    filters.type &&
    (!Number.isFinite(transaction.Amount) ||
      (filters.type === 'income'
        ? transaction.Amount <= 0
        : filters.type === 'expense'
          ? transaction.Amount >= 0
          : transaction.Amount !== 0))
  )
    return false;
  if (filters.from || filters.to) {
    if (!isValidTransactionDate(transaction.DateTime)) return false;
    const date = new Date(transaction.DateTime);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (
      (filters.from && day < filters.from) ||
      (filters.to && day > filters.to)
    )
      return false;
  }
  return true;
}
