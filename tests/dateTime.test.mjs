import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inlineDateTime,
  formatDate,
  timezoneOffset,
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

test('display dates use stable day/month order and retain malformed source text for repair', () => {
  assert.equal(formatDate('2026-11-02T14:28:36'), '02/11/2026 14:28');
  assert.equal(formatDate('invalid-date'), 'invalid-date');
  assert.equal(formatDate(''), '');
});
