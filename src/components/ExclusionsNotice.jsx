export default function ExclusionsNotice({ exclusions, onReview }) {
  const { categories, subcategories, transactions } = exclusions;
  if (!categories.size && !subcategories.size && !transactions.size) return null;
  const counted = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  const rules = [
    ...[...categories].map(category => category || '(No category)'),
    ...[...subcategories].map(key => JSON.parse(key).map(value => value || '(Missing)').join(' / ')),
  ];
  return (
    <aside className="alert demo-notice exclusions-notice" aria-label="Analytics exclusions" role="status">
      <p><strong>Analytics exclusions are active.</strong>{' '}
        {counted(categories.size, 'category', 'categories')}, {counted(subcategories.size, 'subcategory', 'subcategories')} and {counted(transactions.size, 'individual transaction')} excluded from calculations.
      </p>
      {rules.length > 0 && <details>
        <summary><span className="exclusions-show">Show details</span><span className="exclusions-hide">Hide details</span></summary>
        <ul>{rules.map((label, index) => <li key={index}>{label}</li>)}</ul>
      </details>}
      <button type="button" className="text-action" onClick={onReview}>Review exclusions <span aria-hidden="true">↗</span></button>
    </aside>
  );
}
