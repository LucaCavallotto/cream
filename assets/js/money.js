const currency = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
export function formatMoney(value, signed = false) {
  return `${signed && value > 0 ? '+' : value < 0 ? '−' : ''}${currency.format(Math.abs(value))}`;
}

// Narrow non-breaking spaces are also suitable for canvas tooltips and text inputs.
export function spacedMoney(value, signed = false) {
  return formatMoney(value, signed).replace(/^([+−])?€/, (_, sign) => `${sign ? sign + '\u202f' : ''}€\u202f`);
}
