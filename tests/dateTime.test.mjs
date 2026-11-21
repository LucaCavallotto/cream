import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inlineDateTime,
  formatDate,
  timezoneOffset,
  localDateTimeParts,
  editedLocalDateTime,
} from '../assets/js/dateTime.js';

test('inline timestamps preserve explicit offsets, UTC and fractional precision', () => {
  for (const value of [
    '2026-11-02T14:28:36.123+01:00',
    '2026-11-02T14:28:36Z',
    '2026-11-02T14:28:36-0500',
  ]) {
    assert.equal(inlineDateTime(value), value);
  }
});

test('date-only and local timestamps gain the correct seasonal offset without changing wall time', (t) => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!['UTC', 'Europe/Rome'].includes(zone))
    return t.skip(
      'Seasonal expectations cover Europe/Rome and UTC, as exercised in CI.',
    );
  const offsets = zone === 'UTC' ? ['+00:00', '+00:00'] : ['+01:00', '+02:00'];
  assert.equal(
    inlineDateTime('2026-01-02'),
    `2026-01-02T00:00:00${offsets[0]}`,
  );
  assert.equal(
    inlineDateTime('2026-07-02T14:28:36'),
    `2026-07-02T14:28:36${offsets[1]}`,
  );
});

test('timezone suffixes support both signs and non-hour offsets', () => {
  assert.equal(timezoneOffset({ getTimezoneOffset: () => 330 }), '-05:30');
  assert.equal(timezoneOffset({ getTimezoneOffset: () => -345 }), '+05:45');
});

test('display dates use local DD-MM-YYYY HH:MM:SS and mark invalid or missing dates', () => {
  assert.equal(formatDate('2026-11-02T14:28:36'), '02-11-2026 14:28:36');
  assert.equal(formatDate('invalid-date'), 'Invalid date');
  assert.equal(formatDate(''), 'Missing date');
  assert.equal(formatDate('2026-02-30'), 'Invalid date');
});

test('ledger dates can omit seconds without changing detail precision or validation', () => {
  assert.equal(formatDate('2026-11-02T14:28:36', { seconds: false }), '02-11-2026 14:28');
  assert.equal(formatDate('2026-11-02T14:28:36'), '02-11-2026 14:28:36');
  assert.equal(formatDate('invalid', { seconds: false }), 'Invalid date');
});


test('local editor parts retain original timestamps and edits change the intended instant', () => {
  for (const original of ['2026-11-02T23:30:36-05:00', '2026-07-02T14:28:36.123Z', '2026-11-02']) {
    const parts = localDateTimeParts(original);
    assert.equal(editedLocalDateTime(parts.date, parts.time, original), original);
  }
  const original = '2026-11-02T23:30:36-05:00';
  const parts = localDateTimeParts(new Date(new Date(original).getTime() + 60000).toISOString());
  assert.equal(new Date(editedLocalDateTime(parts.date, parts.time, original)).getTime(), new Date(original).getTime() + 60000);
});

test('local editing rejects DST gaps and preserves the original repeated hour', t => {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Europe/Rome') return t.skip('Europe/Rome DST expectations');
  assert.equal(editedLocalDateTime('2026-03-29', '02:30:00'), null);
  assert.equal(editedLocalDateTime('2026-03-29', '03:30:00'), '2026-03-29T03:30:00+02:00');
  assert.equal(editedLocalDateTime('2026-10-25', '02:31:00', '2026-10-25T02:30:00+01:00'), '2026-10-25T02:31:00+01:00');
});
