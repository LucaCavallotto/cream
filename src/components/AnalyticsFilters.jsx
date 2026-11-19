import { formatDate } from '../../assets/js/dateTime.js';
import { useEffect, useState } from 'react';
import {
  createAnalyticsExclusions,
  getAnalyticsExclusionOptions,
  excludeAnalyticsCategory,
  excludeAllAnalyticsCategories,
  isExcludedFromAnalytics,
} from '../../assets/js/analyticsScope.js';

export default function AnalyticsFilters({
  transactions,
  exclusions,
  onChange,
  model,
  resetToken,
}) {
  const [category, setCategory] = useState(''),
    [sub, setSub] = useState(''),
    [search, setSearch] = useState(''),
    [limit, setLimit] = useState(50);
  useEffect(() => { setCategory(''); setSub(''); setSearch(''); setLimit(50); }, [resetToken]);
  const groups = getAnalyticsExclusionOptions(transactions, exclusions);
  const chosen = category && groups.has(JSON.parse(category)) ? category : '';
  const availableSubs = chosen
    ? [...groups.get(JSON.parse(chosen))].sort()
    : [];
  const selectedSub = sub && availableSubs.includes(JSON.parse(sub)) ? sub : '';
  const active =
    exclusions.categories.size +
    exclusions.subcategories.size +
    exclusions.transactions.size;
  const counted = (count, one, many = one + 's') =>
    `${count} ${count === 1 ? one : many}`;
  const mutate = (update) => {
    const next = {
      categories: new Set(exclusions.categories),
      subcategories: new Set(exclusions.subcategories),
      transactions: new Set(exclusions.transactions),
    };
    update(next);
    onChange(next);
  };
  const reset = (next) => {
    setSearch('');
    setLimit(50);
    setCategory('');
    setSub('');
    onChange(next);
  };
  const matching = transactions.filter((t) =>
    [t.Description, t.Category, t.Subcategory, t.DateTime, t.Amount].some(
      (value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    ),
  );
  const rules = [
    ...[...exclusions.categories].map((key) => ({
      collection: 'categories',
      key,
      label: key || '(No category)',
    })),
    ...[...exclusions.subcategories].map((key) => {
      const [cat, subcategory] = JSON.parse(key);
      return {
        collection: 'subcategories',
        key,
        label: `${cat || '(No category)'} / ${subcategory || '(No subcategory)'}`,
      };
    }),
  ];
  return (
    <>
      <details className="card mb-3" id="analyticsExclusionsPanel">
        <summary className="card-header fw-semibold">
          Analytics exclusions
        </summary>
        <div className="card-body">
      <div
        id="analyticsExclusionSummary"
        role="status"
        aria-live="polite"
        className={`alert small mb-3 ${active ? 'alert-warning' : 'alert-info'}`}
      >
        Excluded:{' '}
        {counted(exclusions.categories.size, 'category', 'categories')},{' '}
        {counted(exclusions.subcategories.size, 'subcategory', 'subcategories')}
        , {counted(exclusions.transactions.size, 'individual selection')}.{' '}
        {counted(model.selection.excluded.length, 'transaction')} total;{' '}
        {model.excluded.length} in the selected period.
        {model.selection.invalidCount
          ? ` ${counted(model.selection.invalidCount, 'invalid record')} also outside analytics.`
          : ''}
      </div>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              id="analyticsExcludeAll"
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={
                !transactions.length ||
                transactions.every((t) =>
                  exclusions.categories.has(t.Category || ''),
                )
              }
              onClick={() => reset(excludeAllAnalyticsCategories(transactions))}
            >
              Exclude all
            </button>
            <button
              id="analyticsIncludeAll"
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!active}
              onClick={() => reset(createAnalyticsExclusions())}
            >
              Include all
            </button>
          </div>
          <p className="small text-muted">
            Session-only filters. Reset on file open, close or page reload.
            Monthly comparison always uses the current and previous calendar
            months.
          </p>
          <div>
            <p className="small text-muted mb-0">
              Add exclusions below, or Exclude all and remove the rules for
              categories you want to see.
            </p>
            <div className="row g-2 align-items-end mt-2 mb-3">
              <div className="col-md-5">
                <label
                  htmlFor="analyticsExcludeCategory"
                  className="form-label"
                >
                  Category to exclude
                </label>
                <select
                  id="analyticsExcludeCategory"
                  className="form-select"
                  disabled={!groups.size}
                  value={chosen}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSub('');
                  }}
                >
                  <option value="">
                    {groups.size
                      ? 'Choose category…'
                      : 'All categories excluded'}
                  </option>
                  {[...groups.keys()].sort().map((cat) => (
                    <option key={cat} value={JSON.stringify(cat)}>
                      {cat || '(No category)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label
                  htmlFor="analyticsExcludeSubcategory"
                  className="form-label"
                >
                  Subcategory to exclude
                </label>
                <select
                  id="analyticsExcludeSubcategory"
                  className="form-select"
                  disabled={!chosen}
                  value={selectedSub}
                  onChange={(e) => setSub(e.target.value)}
                >
                  <option value="">Entire category</option>
                  {availableSubs.map((name) => (
                    <option key={name} value={JSON.stringify(name)}>
                      {name || '(No subcategory)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button
                  id="analyticsAddExclusion"
                  type="button"
                  className="btn btn-outline-primary w-100"
                  disabled={!chosen}
                  onClick={() => {
                    mutate((next) =>
                      selectedSub
                        ? next.subcategories.add(
                            JSON.stringify([
                              JSON.parse(chosen),
                              JSON.parse(selectedSub),
                            ]),
                          )
                        : excludeAnalyticsCategory(next, JSON.parse(chosen)),
                    );
                  }}
                >
                  Exclude
                </button>
              </div>
            </div>
            <div id="analyticsExclusionRules" className="small mb-3">
              {rules.length
                ? rules.map((rule) => (
                    <div
                      key={`${rule.collection}:${rule.key}`}
                      className="d-flex justify-content-between align-items-center gap-2 border rounded p-2 mb-2"
                    >
                      <span className="text-break">{rule.label}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary flex-shrink-0"
                        aria-label={`Remove exclusion: ${rule.label}`}
                        onClick={() =>
                          mutate((next) =>
                            next[rule.collection].delete(rule.key),
                          )
                        }
                      >
                        Remove rule
                      </button>
                    </div>
                  ))
                : 'No category or subcategory rules.'}
            </div>
            <details>
              <summary className="fw-semibold">
                Exclude individual transactions
              </summary>
              <p className="small text-muted mt-2">
                Checked records are excluded. This list covers the entire
                dataset, independently of the selected period. Records excluded
                by a category rule are locked here until that rule is removed.
              </p>
              <label htmlFor="analyticsExclusionSearch" className="form-label">
                Find transactions to exclude or include again
              </label>
              <input
                id="analyticsExclusionSearch"
                type="search"
                className="form-control mb-2"
                placeholder="Description, category, date or amount"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(50);
                }}
              />
              <div
                id="analyticsExclusionTransactions"
                className="list-group mb-2"
              >
                {matching.length
                  ? matching.slice(0, limit).map((t) => {
                      const byRule =
                        exclusions.categories.has(t.Category || '') ||
                        exclusions.subcategories.has(
                          JSON.stringify([
                            t.Category || '',
                            t.Subcategory || '',
                          ]),
                        );
                      return (
                        <label
                          key={t.id}
                          className="list-group-item d-flex gap-2 align-items-start"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input flex-shrink-0 mt-1"
                            checked={isExcludedFromAnalytics(t, exclusions)}
                            disabled={byRule}
                            aria-label={`Exclude transaction: ${t.Description || '(Missing description)'} (${formatDate(t.DateTime)})`}
                            onChange={(e) =>
                              mutate((next) =>
                                e.target.checked
                                  ? next.transactions.add(t.id)
                                  : next.transactions.delete(t.id),
                              )
                            }
                          />
                          <span className="small text-break">
                            {formatDate(t.DateTime)} ·{' '}
                            {t.Description || '(Missing description)'} ·{' '}
                            {Number.isFinite(t.Amount)
                              ? `€${t.Amount.toFixed(2)}`
                              : '(Invalid amount)'}{' '}
                            · {t.Category || '(No category)'}
                            {t.Subcategory ? ` / ${t.Subcategory}` : ''}
                            {byRule
                              ? ' · Excluded by category/subcategory rule'
                              : ''}
                          </span>
                        </label>
                      );
                    })
                  : 'No matching transactions.'}
              </div>
              <p id="analyticsExclusionCount" className="small text-muted">
                {exclusions.transactions.size} individual selections. Showing{' '}
                {Math.min(matching.length, limit)} of {matching.length} matching
                records.
              </p>
              <button
                id="analyticsExclusionMore"
                className={`btn btn-outline-secondary btn-sm ${limit >= matching.length ? 'd-none' : ''}`}
                onClick={() => setLimit((value) => value + 50)}
              >
                Show 50 more
              </button>
            </details>
          </div>
        </div>
      </details>

    </>
  );
}
