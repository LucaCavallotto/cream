import { isValidTransactionDate } from './datasetHealth.js';
export function timezoneOffset(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  return `${offset >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
}

export function inlineDateTime(value) {
  if (value.includes('T'))
    return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
      ? value
      : value + timezoneOffset(new Date(value));
  return `${value}T00:00:00${timezoneOffset(new Date(`${value}T00:00:00`))}`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (!value) return 'Missing date';
  if (!isValidTransactionDate(value)) return 'Invalid date';
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}
