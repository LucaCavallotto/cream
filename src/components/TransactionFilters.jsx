export default function TransactionFilters({ state, dispatch }) {
  const filters = state.transactionFilters;
  const groups = new Map(
    Object.entries(state.categories).map(([category, subs]) => [
      category,
      new Set(subs),
    ]),
  );
  state.transactions.forEach((t) => {
    if (!groups.has(t.Category)) groups.set(t.Category, new Set());
    groups.get(t.Category).add(t.Subcategory);
  });
  const update = (field, value) =>
    dispatch({
      type: 'transactionFilters',
      value: {
        ...filters,
        [field]: value,
        ...(field === 'category' ? { subcategory: '' } : {}),
      },
    });
  return (
    <details className="transaction-filters cream-panel mb-3">
      <summary>
        Transaction filters
        {Object.values(filters).filter(Boolean).length ? ' · Active' : ''}
      </summary>
      <div className="row g-3 mt-1">
        <div className="col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="filterCategory">
            Category
          </label>
          <select
            className="form-select"
            id="filterCategory"
            value={filters.category}
            onChange={(event) => update('category', event.target.value)}
          >
            <option value="">All categories</option>
            {[...groups.keys()].sort().map((category) => (
              <option key={category} value={JSON.stringify(category)}>
                {category || '(No category)'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="filterSubcategory">
            Subcategory
          </label>
          <select
            className="form-select"
            id="filterSubcategory"
            value={filters.subcategory}
            onChange={(event) => update('subcategory', event.target.value)}
          >
            <option value="">All subcategories</option>
            {[...groups]
              .filter(
                ([category]) =>
                  !filters.category ||
                  category === JSON.parse(filters.category),
              )
              .map(([category, subs]) => (
                <optgroup label={category || '(No category)'} key={category}>
                  {[...subs].sort().map((sub) => (
                    <option key={sub} value={JSON.stringify([category, sub])}>
                      {sub || '(No subcategory)'}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="filterType">
            Type
          </label>
          <select
            className="form-select"
            id="filterType"
            value={filters.type}
            onChange={(event) => update('type', event.target.value)}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
            <option value="zero">Zero amount</option>
          </select>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label" htmlFor="filterNeedWant">Need / Want</label>
          <select className="form-select" id="filterNeedWant" value={filters.needWant || ''} onChange={event => update('needWant', event.target.value)}>
            <option value="">All classifications</option>
            <option value="need">Need</option>
            <option value="want">Want</option>
            <option value="unclassified">Not classified</option>
          </select>
        </div>
        {['from', 'to'].map((field) => (
          <div className="col-sm-6 col-lg-4" key={field}>
            <label className="form-label" htmlFor={`filter-${field}`}>
              {field === 'from' ? 'From' : 'To'}
            </label>
            <input
              className="form-control"
              type="date"
              id={`filter-${field}`}
              value={filters[field]}
              onChange={(event) => update(field, event.target.value)}
            />
          </div>
        ))}
        {filters.from && filters.to && filters.from > filters.to && (
          <p className="text-danger" role="alert">
            The start date must be before or equal to the end date.
          </p>
        )}
        <div>
          <button
            className="btn btn-outline-secondary"
            onClick={() => dispatch({ type: 'clearTransactionFilters' })}
          >
            Clear
          </button>
        </div>
      </div>
    </details>
  );
}
