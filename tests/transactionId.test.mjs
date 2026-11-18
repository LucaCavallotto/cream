import assert from 'node:assert/strict';
import test from 'node:test';
import { createTransactionId } from '../assets/js/transactionId.js';

test('uses native randomUUID with its crypto receiver when available', () => {
  const provider = { randomUUID() { assert.equal(this, provider); return 'native-id'; } };
  assert.equal(createTransactionId(provider), 'native-id');
});

test('generates distinct version 4 UUIDs when randomUUID is unavailable', () => {
  const provider = { getRandomValues: array => globalThis.crypto.getRandomValues(array) };
  const ids = Array.from({ length: 1000 }, () => createTransactionId(provider));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('keeps rows distinct with no Web Crypto provider', () => {
  const ids = Array.from({ length: 1000 }, () => createTransactionId(null));
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.every(id => id.startsWith('transaction-')));
});
