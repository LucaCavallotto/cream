import { normalizeTags } from './transactions.js';
import { parseImportedAmount } from './datasetHealth.js';

export const CSV_HEADERS = ['DateTime', 'Amount', 'Description', 'Category', 'Subcategory', 'Tags', 'Notes', 'NeedWant'];

// The app passes the browser's PapaParse instance; integration tests use the same
// published version. Parsing completes before the caller replaces its dataset.
export function parseTransactionsCSV(text, parser) {
  const result = parser.parse(text.replace(/^\uFEFF/, ''), { skipEmptyLines: true });
  const errors = result.errors.map(error => error.message);
  const [header = [], ...records] = result.data;
  const fields = header.map(value => value.trim());
  const missing = CSV_HEADERS.filter(field => field !== 'NeedWant' && !fields.includes(field));
  const extra = fields.filter(field => !CSV_HEADERS.includes(field));
  if (missing.length) errors.push(`Missing required columns: ${missing.join(', ')}`);
  if (extra.length) errors.push(`Unsupported columns: ${extra.join(', ')}`);
  if (new Set(fields).size !== fields.length) errors.push('Duplicate column names.');
  records.forEach((row, index) => {
    const needWant = fields.indexOf('NeedWant');
    if (needWant >= 0 && !['', 'need', 'want'].includes(String(row[needWant] ?? '').trim().toLowerCase())) errors.push(`Record ${index + 1}: NeedWant must be blank, need or want.`);
    if (row.length !== fields.length) errors.push(`Record ${index + 1}: expected ${fields.length} fields, found ${row.length}.`);
  });
  if (errors.length) return { transactions: [], errors };
  return {
    errors: [],
    transactions: records.map(values => {
      const row = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
      return {
        DateTime: row.DateTime, Amount: parseImportedAmount(row.Amount),
        Description: row.Description, Category: row.Category, Subcategory: row.Subcategory,
        Tags: normalizeTags(row.Tags), Notes: row.Notes, NeedWant: (row.NeedWant || '').trim().toLowerCase()
      };
    })
  };
}

export function serializeTransactionsCSV(transactions, parser) {
  return parser.unparse({ fields: CSV_HEADERS, data: transactions.map(transaction =>
    CSV_HEADERS.map(field => transaction[field] ?? '')
  ) });
}
