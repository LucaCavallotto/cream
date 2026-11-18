// IDs identify in-memory rows only; they are never credentials or CSV fields.
let sequence = 0;
const sessionPrefix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createTransactionId(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider?.randomUUID === 'function') {
    return cryptoProvider.randomUUID();
  }
  // getRandomValues is also available in browsers on non-secure LAN origins.
  if (typeof cryptoProvider?.getRandomValues === 'function') {
    const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)].map(part => part.join('')).join('-');
  }
  // A monotonic suffix keeps rows distinct even without Web Crypto or clocks.
  return `transaction-${sessionPrefix}-${++sequence}`;
}
