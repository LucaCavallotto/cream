import { isValidTransactionDate } from '../../assets/js/datasetHealth.js';
import { drilldownTransactions } from '../../assets/js/analyticsNavigation.js';
import TransactionFilters from './TransactionFilters.jsx';
import { matchesTransactionFilters } from '../../assets/js/transactionFilters.js';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { compareTransactions } from '../../assets/js/transactions.js';
import { formatDate } from '../../assets/js/dateTime.js';
import Money from './Money.jsx';
import { getCategoryMeta } from '../../assets/js/categoryMeta.js';
import TagInput from './TagInput.jsx';

export default function Transactions({
  state,
  dispatch,
  tags,
  onEdit,
  onDelete,
  onTab,
}) {
  const [bulkCategory, setBulkCategory] = useState(''),
    [bulkSubcategory, setBulkSubcategory] = useState(''),
    [bulkTags, setBulkTags] = useState('');
  useEffect(() => {
    if (!state.isSelectionMode) {
      setBulkCategory('');
      setBulkSubcategory('');
      setBulkTags('');
    }
  }, [state.isSelectionMode]);
  const rows = useMemo(
    () =>
      drilldownTransactions(state.transactions, state.analyticsExclusions, state.analyticsDrilldown)
        .filter(
          (t) =>
            !state.searchQuery ||
            [
              'Description',
              'Amount',
              'Category',
              'Subcategory',
              'Tags',
              'Notes',
            ].some((field) =>
              String(t[field] ?? '')
                .toLowerCase()
                .includes(state.searchQuery),
            ),
        )
        .filter((t) => matchesTransactionFilters(t, state.transactionFilters))
        .sort((a, b) => compareTransactions(a, b, state.sort)),
    [
      state.transactions,
      state.analyticsExclusions,
      state.analyticsDrilldown,
      state.searchQuery,
      state.sort,
      state.transactionFilters,
    ],
  );
  const toggle = (id) =>
    dispatch({
      type: 'select',
      ids: state.selectedIds.includes(id)
        ? state.selectedIds.filter((value) => value !== id)
        : [...state.selectedIds, id],
    });
  const bulk = (field, value) => {
    if (!value || !state.selectedIds.length) return;
    if (
      confirm(
        `Apply ${field.toLowerCase()} to ${state.selectedIds.length} transactions?`,
      )
    )
      dispatch({ type: 'bulk', field, value });
  };
  return (
    <>
      <button
        id="btnBackToAnalytics"
        className={`btn btn-outline-secondary mb-3 ${state.analyticsReturnContext ? '' : 'd-none'}`}
        onClick={() => onTab('Analytics')}
      >
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to Analytics
      </button>
      {state.analyticsDrilldown && <p className="scope-note" role="status">Analytics selection: {state.analyticsDrilldown.label}. Period and exclusions apply.</p>}
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p className="page-description">Search, filter and review every record.</p>
        </div>
      </div>
      <div className="ledger-toolbar">
        <div className="ledger-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            id="inputSearchTransaction"
            type="text"
            role="searchbox"
            inputMode="search"
            className="form-control"
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={state.searchText}
            onChange={(event) =>
              dispatch({ type: 'search', value: event.target.value })
            }
          />
          <button
            id="btnClearSearch"
            type="button"
            aria-label="Clear search"
            className={`btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0 ${state.searchText ? '' : 'd-none'}`}
            onClick={() => dispatch({ type: 'search', value: '' })}
          >
            <i className="bi bi-x-circle" aria-hidden="true" />
          </button>
        </div>
        {!state.viewOnlyMode && (
          <button
            id="btnSelectMode"
            className="btn btn-outline-secondary"
            onClick={() =>
              dispatch({ type: 'selection', value: !state.isSelectionMode })
            }
          >
            <i className="bi bi-check2-square" aria-hidden="true" />{' '}
            {state.isSelectionMode ? 'Cancel' : 'Select'}
          </button>
        )}
        <span className="ledger-count">
          {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}
        </span>
        <div className="ledger-sort">
          <label htmlFor="transactionSort">Sort</label>
          <select
            id="transactionSort"
            className="form-select"
            value={`${state.sort.column}:${state.sort.direction}`}
            onChange={(event) => {
              const [column, direction] = event.target.value.split(':');
              dispatch({ type: 'sort', column, direction });
            }}
          >
            <option value="Date:desc">Newest first</option>
            <option value="Date:asc">Oldest first</option>
            <option value="Amount:desc">Amount: high to low</option>
            <option value="Amount:asc">Amount: low to high</option>
            <option value="Category:asc">Category: A–Z</option>
            <option value="Category:desc">Category: Z–A</option>
          </select>
        </div>
      </div>
      <TransactionFilters state={state} dispatch={dispatch} />
      <div
        id="bulkActionsMenu"
        className={`mb-3 p-3 bg-body-tertiary rounded shadow-sm border border-primary-subtle ${state.isSelectionMode ? '' : 'd-none'}`}
      >
        <div className="d-flex flex-column flex-md-row align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <button
              id="btnCancelSelection"
              className="btn btn-link text-secondary p-0"
              title="Cancel Selection"
              onClick={() => dispatch({ type: 'selection', value: false })}
            >
              <i className="bi bi-x-lg" />
            </button>
            <span className="fw-bold text-primary">
              <span id="selectedCount">{state.selectedIds.length}</span>{' '}
              Selected
            </span>
          </div>
          <div className="vr d-none d-md-block" />
          <div className="d-flex flex-column flex-md-row flex-wrap align-items-stretch align-items-md-center gap-2 flex-grow-1">
            <div
              className="input-group input-group-sm flex-grow-1"
              style={{ minWidth: 150, maxWidth: 400 }}
            >
              <label className="input-group-text" htmlFor="bulkCategorySelect">
                Category
              </label>
              <select
                id="bulkCategorySelect"
                className="form-select"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                <option value="" disabled>
                  Choose...
                </option>
                {Object.keys(state.categories).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <button
                id="btnBulkApplyCategory"
                className="btn btn-primary"
                disabled={!state.selectedIds.length}
                onClick={() => bulk('Category', bulkCategory)}
              >
                Apply
              </button>
            </div>
            <div
              className="input-group input-group-sm flex-grow-1"
              style={{ minWidth: 150, maxWidth: 400 }}
            >
              <label
                className="input-group-text"
                htmlFor="bulkSubcategorySelect"
              >
                Subcategory
              </label>
              <select
                id="bulkSubcategorySelect"
                className="form-select"
                value={bulkSubcategory}
                onChange={(e) => setBulkSubcategory(e.target.value)}
              >
                <option value="" disabled>
                  Choose...
                </option>
                {Object.entries(state.categories).map(([cat, subs]) => (
                  <optgroup key={cat} label={cat}>
                    {subs.map((sub) => (
                      <option key={sub} value={`${cat}|${sub}`}>
                        {sub}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                id="btnBulkApplySubcategory"
                className="btn btn-primary"
                disabled={!state.selectedIds.length}
                onClick={() =>
                  bulk(
                    'Subcategory',
                    bulkSubcategory ? bulkSubcategory.split('|') : '',
                  )
                }
              >
                Apply
              </button>
            </div>
            <div
              className="input-group input-group-sm position-relative flex-grow-1"
              style={{ minWidth: 150, maxWidth: 400 }}
            >
              <label className="input-group-text" htmlFor="bulkTagsInput">
                Tags
              </label>
              <TagInput
                id="bulkTagsInput"
                value={bulkTags}
                onChange={setBulkTags}
                tags={tags}
              />
              <button
                id="btnBulkApplyTags"
                className="btn btn-primary"
                disabled={!state.selectedIds.length}
                onClick={() => bulk('Tags', bulkTags)}
              >
                Apply
              </button>
            </div>
            <button
              id="btnBulkDelete"
              className="btn btn-sm btn-outline-danger ms-md-auto w-100 w-md-auto py-2 py-md-1"
              disabled={!state.selectedIds.length}
              onClick={() => onDelete(state.selectedIds)}
            >
              <i className="bi bi-trash me-1" />
              Delete Selected
            </button>
          </div>
        </div>
      </div>
      <div
        className={`table-responsive bg-body rounded shadow-sm ${rows.length ? '' : 'd-none'}`}
      >
        <table
          className="table align-middle mb-0 transaction-table"
          id="transactionsTable"
        >
          <thead className="table-dark">
            <tr>
              <th
                className={`selection-column text-center ${state.isSelectionMode ? '' : 'd-none'}`}
                style={{ width: 40 }}
              >
                <input
                  id="selectAllCheckbox"
                  type="checkbox"
                  className="form-check-input"
                  aria-label="Select all transactions"
                  checked={
                    !!rows.length &&
                    rows.every((t) => state.selectedIds.includes(t.id))
                  }
                  onChange={(e) =>
                    dispatch({
                      type: 'select',
                      ids: e.target.checked ? rows.map((t) => t.id) : [],
                    })
                  }
                />
              </th>
              {[
                'Description',
                'Date',
                'Category',
                'Tags',
                'Notes',
                'Amount',
              ].map((field) => {
                const sortable = ['Date', 'Category', 'Amount'].includes(field);
                const responsive = ['Description', 'Date', 'Amount'].includes(
                  field,
                )
                  ? 'd-md-table-cell'
                  : field === 'Category'
                    ? 'd-lg-table-cell'
                    : 'd-xl-table-cell';
                return (
                  <th
                    key={field}
                    scope="col"
                    data-sort={sortable ? field : undefined}
                    aria-sort={
                      sortable && state.sort.column === field
                        ? state.sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`d-none ${responsive} ${field === 'Amount' ? 'text-end' : ''}`}
                    onClick={
                      sortable
                        ? () => dispatch({ type: 'sort', column: field })
                        : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        className="sort-header-button"
                        aria-label={`Sort by ${field.toLowerCase()}`}
                      >
                        {field}
                        <span aria-hidden="true">
                          {state.sort.column === field
                            ? state.sort.direction === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    ) : field === 'Description' ? (
                      'Transaction'
                    ) : (
                      field
                    )}
                  </th>
                );
              })}
              <th
                scope="col"
                id="thActions"
                className={`text-end text-nowrap ${state.viewOnlyMode || state.isSelectionMode ? 'd-none' : 'd-none d-md-table-cell'}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody id="transactionsTbody">
            {rows.map((t, index) => {
              const date = new Date(t.DateTime),
                year = String(date.getFullYear()),
                month = String(date.getMonth() + 1).padStart(2, '0'),
                previous = rows[index - 1];
              const dated = state.sort.column === 'Date' && isValidTransactionDate(t.DateTime);
              const selected = state.selectedIds.includes(t.id),
                meta = getCategoryMeta(t.Category);
              const valid = Number.isFinite(t.Amount),
                income = t.Amount >= 0;
              const amount = valid
                ? <Money value={t.Amount} signed />
                : 'Invalid / missing amount';
              const color = !valid
                ? 'text-warning fw-bold'
                : income
                  ? 'text-success fw-bold'
                  : 'text-danger fw-bold';
              return (
                <Fragment key={t.id}>
                  {dated &&
                    (!previous || String(new Date(previous.DateTime).getFullYear()) !== year) && (
                      <tr className="year-divider-row divider-row">
                        <td
                          colSpan={8}
                          className="p-2 text-center text-muted fw-bold small text-uppercase border-0"
                        >
                          — {year} —
                        </td>
                      </tr>
                    )}
                  {dated &&
                    (!previous ||
                      new Date(previous.DateTime).getMonth() !== date.getMonth() || new Date(previous.DateTime).getFullYear() !== date.getFullYear()) && (
                      <tr className="month-divider-row divider-row">
                        <td
                          colSpan={8}
                          className="px-3 py-2 text-primary fw-semibold small text-uppercase border-0"
                          style={{
                            backgroundColor: 'var(--bs-secondary-bg)',
                            opacity: 0.9,
                          }}
                        >
                          {[
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                          ][Number(month) - 1] || month}{' '}
                          {year}
                        </td>
                      </tr>
                    )}
                  <tr
                    className={`mobile-row-click ${index % 2 ? 'bg-body-tertiary' : ''}`}
                    data-id={t.id}
                    onClick={(event) =>
                      state.isSelectionMode
                        ? toggle(t.id)
                        : onEdit(t, event.currentTarget)
                    }
                  >
                    <td
                      className={`selection-column text-center ${state.isSelectionMode ? '' : 'd-none'}`}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input transaction-checkbox"
                        aria-label={`Select ${t.Description}`}
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggle(t.id)}
                      />
                    </td>
                    <td className="d-none d-md-table-cell description-cell">
                      <span>{t.Description || '(Missing description)'}</span>
                      <div className="description-meta">
                        {t.Subcategory || 'No subcategory'}
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell text-muted">
                      {formatDate(t.DateTime, { seconds: false })}
                    </td>
                    <td className="d-none d-lg-table-cell">
                      <span className="badge bg-secondary">
                        {t.Category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="d-none d-xl-table-cell">
                      {t.Tags.split(/\s+/)
                        .filter(Boolean)
                        .map((tag) => (
                          <span className="badge me-1" key={tag}>
                            {tag}
                          </span>
                        ))}
                    </td>
                    <td
                      className="d-none d-xl-table-cell notes-cell"
                      title={t.Notes}
                    >
                      {t.Notes}
                    </td>
                    <td
                      className={`d-none d-md-table-cell amount-cell ${color}`}
                    >
                      {amount}
                    </td>
                    {!state.viewOnlyMode && (
                      <td
                        className={`text-end text-nowrap ${state.isSelectionMode ? 'd-none' : 'd-none d-md-table-cell'}`}
                      >
                        <button
                          className="btn btn-sm btn-outline-primary me-1 btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(t, e.currentTarget);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger btn-del"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete([t.id]);
                          }}
                        >
                          Del
                        </button>
                      </td>
                    )}
                    <td className="d-md-none mobile-visible w-100 p-0 border-0">
                      <div
                        className={`d-flex align-items-center w-100 p-2 ${selected && state.isSelectionMode ? 'bg-primary-subtle' : ''}`}
                      >
                        <div style={{ width: 44, flexShrink: 0 }}>
                          <div
                            className={`category-icon shadow-sm ${meta.color}`}
                          >
                            <i className={`bi ${meta.icon}`} />
                          </div>
                        </div>
                        <div
                          className="flex-grow-1 ms-3 overflow-hidden"
                          style={{ minWidth: 0 }}
                        >
                          <div
                            className="fw-bold text-truncate"
                            style={{ fontSize: '1.05rem' }}
                          >
                            {t.Description}
                          </div>
                          <div className="text-muted small text-truncate">
                            {t.Category}
                            {t.Subcategory ? ` / ${t.Subcategory}` : ''}
                          </div>
                          {t.Notes && (
                            <div className="text-muted small text-truncate">
                              {t.Notes}
                            </div>
                          )}
                        </div>
                        <div
                          className="text-end ms-2"
                          style={{ flexShrink: 0 }}
                        >
                          <div
                            className={`${color} text-nowrap`}
                            style={{ fontSize: '1.1rem' }}
                          >
                            {amount}
                          </div>
                          <div className="text-muted small mt-1 text-nowrap">
                            {formatDate(t.DateTime, { seconds: false })}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        id="emptyState"
        className={`text-center py-5 text-muted ${rows.length ? 'd-none' : ''}`}
      >
        No transactions found. Add one to get started!
      </div>
      <div className="ledger-footer">
        <span>
          {rows.length} of {state.transactions.length} records
        </span>
        <span>
          Select a transaction for details.{' '}
        </span>
      </div>
    </>
  );
}
