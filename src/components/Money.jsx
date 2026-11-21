import { formatMoney } from '../../assets/js/money.js';

// Keep every currency token on one baseline, with consistent visual spacing.
export default function Money({ value, signed = false, formatted }) {
  const text = formatted ?? formatMoney(value, signed);
  const parts = text.match(/^([+−-]?)(€)(.*)$/);
  if (!parts) return text;
  return <span className="money-amount">
    {parts[1] && <span className="money-sign">{parts[1]}</span>}
    <span className="money-currency">{parts[2]}</span>
    <span className="money-number">{parts[3]}</span>
  </span>;
}
