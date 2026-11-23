import { needWantSummary } from '../../assets/js/needWant.js';
import Money from './Money.jsx';

export default function NeedWantSummary({ rows }) {
  return <section className="cream-panel need-want-summary" aria-label="Need and Want spending">
    <h2>Need &amp; Want</h2>
    <p className="text-muted">Included expenses by optional classification.</p>
    <div className="need-want-grid">{needWantSummary(rows).map(group => <div key={group.key}>
      <h3>{group.label}</h3><Money value={group.amount} fit />
      <span className="text-muted d-block">{group.percent.toFixed(1)}% of expenses</span>
    </div>)}</div>
  </section>;
}
