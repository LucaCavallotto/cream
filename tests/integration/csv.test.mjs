import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Papa from 'papaparse';
import { CSV_HEADERS, parseTransactionsCSV, serializeTransactionsCSV } from '../../assets/js/csv.js';

export const sample = { DateTime: '2026-11-02T14:28:36.123+01:00', Amount: -1.25,
  Description: 'Caffè, "offerto" ☕', Category: 'Bar', Subcategory: 'Coffee', Tags: '#friend #work', Notes: 'First line\nSecond line, "quoted"' };
const csv = rows => serializeTransactionsCSV(rows, Papa);

test('real PapaParse roundtrip preserves every field including quotes, Unicode, multiline notes and timezone', () => {
  const result = parseTransactionsCSV(csv([sample]), Papa);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.transactions, [sample]);
  assert.equal(parseTransactionsCSV(csv(result.transactions), Papa).transactions[0].Notes, sample.Notes);
});

test('BOM, CRLF, LF, blank lines, reordered headers and surrounding header whitespace', () => {
  const fields = [...CSV_HEADERS].reverse();
  const text = Papa.unparse({ fields: fields.map(h => ` ${h} `), data: [fields.map(h => sample[h])] });
  const result = parseTransactionsCSV('\uFEFF' + text + '\r\n\r\n', Papa);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.transactions, [sample]);
  assert.equal(parseTransactionsCSV(csv([sample]).replaceAll('\r\n', '\n'), Papa).transactions.length, 1);
});

test('empty datasets retain headers and blank records remain available for health checks', () => {
  assert.equal(csv([]).trimEnd(), CSV_HEADERS.join(','));
  assert.deepEqual(parseTransactionsCSV(csv([]), Papa).transactions, []);
  const blank = Object.fromEntries(CSV_HEADERS.map(h => [h, '']));
  assert.deepEqual(parseTransactionsCSV(csv([blank]), Papa).transactions, [blank]);
});

test('invalid and zero amounts are preserved distinctly; legacy tags are normalized', () => {
  for (const amount of ['', ' ', '12oops', 'Infinity', '1,50', 0, -25.5]) {
    const row = { ...sample, Amount: amount, Tags: 'friend, #work #work ##friend' };
    const result = parseTransactionsCSV(csv([row]), Papa);
    assert.equal(result.transactions[0].Amount, amount);
    assert.equal(result.transactions[0].Tags, '#friend #work');
  }
});

test('internal IDs and view settings never leak into the CSV', () => {
  const text = csv([{ ...sample, id: 'private-id', excluded: true }]);
  assert(!text.includes('private-id'));
  assert.deepEqual(Papa.parse(text, { header: true }).meta.fields, CSV_HEADERS);
});

test('missing, extra and duplicate headers are rejected instead of dropping data', () => {
  for (const fields of [CSV_HEADERS.slice(1), [...CSV_HEADERS, 'Extra'], [...CSV_HEADERS, 'Notes'], []]) {
    const text = Papa.unparse({ fields, data: fields.length ? [fields.map(() => 'x')] : [] });
    assert(parseTransactionsCSV(text, Papa).errors.length > 0);
  }
});

test('unterminated quotes and inconsistent field counts reject the entire import', () => {
  for (const suffix of ['\n2026-11-02,-1,"unfinished', '\n2026-11-02,-1,short', '\n1,2,3,4,5,6,7,8']) {
    const result = parseTransactionsCSV(csv([sample]) + suffix, Papa);
    assert(result.errors.length > 0);
    assert.deepEqual(result.transactions, []);
  }
});

test('demo.csv and every populated classification remain valid', () => {
  const result = parseTransactionsCSV(readFileSync(new URL('../../demo.csv', import.meta.url), 'utf8'), Papa);
  const categories = JSON.parse(readFileSync(new URL('../../data/categories.json', import.meta.url)));
  assert.deepEqual(result.errors, []);
  assert.equal(result.transactions.length, 31);
  for (const row of result.transactions) {
    if (row.Category) assert(Object.hasOwn(categories, row.Category));
    if (row.Subcategory) assert(categories[row.Category].includes(row.Subcategory));
  }
});

test('deterministic roundtrip corpus preserves many combinations of CSV delimiters and Unicode', () => {
  const fragments = ['comma,', '"quote"', '\nline', '\r\nCRLF', 'caffè ☕', '旅行', 'plain', '  spaces  '];
  const rows = Array.from({ length: 128 }, (_, index) => ({ ...sample,
    Amount: (index - 64) / 100,
    Description: fragments[index % fragments.length] + fragments[Math.floor(index / fragments.length) % fragments.length],
    Notes: fragments[(index * 3) % fragments.length] + '\n' + index
  }));
  const result = parseTransactionsCSV(csv(rows), Papa);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.transactions, rows);
});
