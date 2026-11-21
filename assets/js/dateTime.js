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

export function formatDate(value, { seconds = true } = {}) {
  const date = new Date(value);
  if (!value) return 'Missing date';
  if (!isValidTransactionDate(value)) return 'Invalid date';
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}${seconds ? `:${String(date.getSeconds()).padStart(2, '0')}` : ''}`;
}

export function localDateTimeParts(value) {
  if (!isValidTransactionDate(value)) return {
    date: value?.split('T')[0] || '',
    time: value?.split('T')[1]?.match(/^\d{2}:\d{2}(?::\d{2})?/)?.[0] || '',
  };
  const date = new Date(value), pad = number => String(number).padStart(2, '0');
  return {
    date: `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

export function editedLocalDateTime(date, time, original) {
  const fullTime = time.length === 5 ? `${time}:00` : time;
  const matches = value => {
    if (!isValidTransactionDate(value)) return false;
    const parts = localDateTimeParts(value);
    return parts.date === date && parts.time === fullTime;
  };
  if (original && matches(original)) return original;
  // During a repeated DST hour retain the original occurrence when possible.
  if (isValidTransactionDate(original)) {
    const candidate = `${date}T${fullTime}${timezoneOffset(new Date(original))}`;
    if (matches(candidate)) return candidate;
  }
  const parsed = new Date(`${date}T${fullTime}`);
  if (isNaN(parsed)) return null;
  const candidate = `${date}T${fullTime}${timezoneOffset(parsed)}`;
  return matches(candidate) ? candidate : null;
}
