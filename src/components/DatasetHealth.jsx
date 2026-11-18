import { useMemo, useState } from 'react';
import {
  analyzeDataset,
  HEALTH_CHECKS,
} from '../../assets/js/datasetHealth.js';

export default function DatasetHealth({
  transactions,
  categories,
  viewOnly,
  onEdit,
}) {
  const [filter, setFilter] = useState(''),
    [limit, setLimit] = useState(50);
  const report = useMemo(
    () => analyzeDataset(transactions, categories),
    [transactions, categories],
  );
  const filtered = report.dirty.filter(
    (row) => !filter || row.issues.some((issue) => issue.code === filter),
  );
  return (
    <>
      <h4>Dataset Health</h4>
      <p className="text-muted">
        Review missing fields, invalid dates or amounts, and classifications
        outside the current catalog. Tags and notes are optional. Missing
        subcategories and explicitly uncategorized records are reminders to
        review, not blocked transactions.
      </p>
      <div className="row g-3 mb-3" aria-live="polite">
        {[
          ['cleanupTotal', 'Total transactions', report.total, ''],
          ['cleanupClean', 'No detected issues', report.clean, 'text-success'],
          [
            'cleanupDirty',
            'Transactions to review',
            report.dirty.length,
            'text-warning',
          ],
          ['cleanupIssueCount', 'Issues found', report.issueCount, ''],
        ].map(([id, label, value, color]) => (
          <div key={id} className="col-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="text-muted">{label}</h6>
                <p id={id} className={`h3 mb-0 ${color}`}>
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p id="cleanupStatus" role="status">
        {report.total
          ? `${Math.round((report.clean / report.total) * 100)}% of transactions have no detected issues.`
          : 'No transactions to check. Open a CSV or add transactions to get started.'}
      </p>
      <p className="small text-muted">
        Checks cover the entire open dataset, independently of transaction
        search and analytics filters. Rows with invalid or missing dates or
        amounts are excluded from analytics until corrected. Corrections stay in
        memory until you click Save Changes; Undo Changes restores the last
        saved data.
      </p>
      <div
        id="cleanupReadOnly"
        className={`alert alert-info ${viewOnly ? '' : 'd-none'}`}
        role="status"
      >
        View Only Mode is active. You can inspect transactions, but editing is
        disabled.
      </div>
      <div className="mb-3" style={{ maxWidth: 420 }}>
        <label htmlFor="cleanupFilter" className="form-label">
          Filter by issue
        </label>
        <select
          id="cleanupFilter"
          className="form-select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setLimit(50);
          }}
        >
          <option value="">All issues</option>
          {Object.entries(HEALTH_CHECKS)
            .filter(([code]) => report.counts[code] || code === filter)
            .map(([code, label]) => (
              <option key={code} value={code}>
                {label} ({report.counts[code] || 0})
              </option>
            ))}
        </select>
      </div>
      <div id="cleanupRecords" className="list-group mb-3">
        {filtered
          .slice(0, limit)
          .map(({ transaction: t, recordNumber, issues }) => (
            <article className="list-group-item p-3" key={t.id}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div className="overflow-hidden">
                  <h6 className="fw-bold text-break mb-1">
                    #{recordNumber} ·{' '}
                    {t.Description.trim() || '(Missing description)'}
                  </h6>
                  <p className="small text-muted text-break mb-2">
                    {[
                      t.DateTime || '(Missing date)',
                      Number.isFinite(t.Amount)
                        ? `€${t.Amount.toFixed(2)}`
                        : t.Amount || '(Missing amount)',
                      t.Category || '(Missing category)',
                      t.Subcategory || '(Missing subcategory)',
                    ].join(' · ')}
                  </p>
                  <ul className="small mb-0 ps-3">
                    {issues.map((issue) => (
                      <li key={issue.code}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm flex-shrink-0"
                  aria-label={`${viewOnly ? 'View' : 'Review / Edit'} transaction ${recordNumber}`}
                  onClick={(event) => onEdit(t, event.currentTarget)}
                >
                  {viewOnly ? 'View' : 'Review / Edit'}
                </button>
              </div>
            </article>
          ))}
      </div>
      <div
        id="cleanupEmpty"
        className={`alert alert-success ${filtered.length ? 'd-none' : ''}`}
        role="status"
      >
        {report.dirty.length
          ? 'No transactions match this issue filter.'
          : report.total
            ? 'All transactions pass the dataset checks.'
            : 'No transactions yet.'}
      </div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <span id="cleanupVisibleCount" className="small text-muted">
          Showing {Math.min(filtered.length, limit)} of {filtered.length}{' '}
          transactions to review
        </span>
        <button
          id="cleanupShowMore"
          type="button"
          className={`btn btn-outline-secondary ${limit >= filtered.length ? 'd-none' : ''}`}
          onClick={() => setLimit((value) => value + 50)}
        >
          Show 50 more
        </button>
      </div>
    </>
  );
}
