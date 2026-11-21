import { useMemo } from 'react';
import { analyticsModel } from '../../assets/js/analyticsModel.js';
import AnalyticsChart from './AnalyticsChart.jsx';
import Star from './Star.jsx';
import { compareTransactions } from '../../assets/js/transactions.js';
import { formatDate } from '../../assets/js/dateTime.js';
import Money from './Money.jsx';
import { getCategoryMeta } from '../../assets/js/categoryMeta.js';

function CardCallout({ children, onClick }) {
  return <div className="card-callout"><button type="button" onClick={onClick}>{children}<span aria-hidden="true">↗</span></button></div>;
}

export default function Overview({
  state,
  theme,
  reducedMotion,
  active,
  onAnalytics,
  model,
  health,
  onTab,
  onEdit,
  onViewAll,
}) {
  const flowModel = useMemo(() => analyticsModel(state.transactions, state.analyticsExclusions, 'last_12_months', ''), [state.transactions, state.analyticsExclusions]);
  const recent = [...state.transactions]
    .sort((a, b) =>
      compareTransactions(a, b, { column: 'Date', direction: 'desc' }),
    )
    .slice(0, 5);
  const cleanPercent = health.total
    ? Math.round((health.clean / health.total) * 100)
    : 0;
  const comparison =
    model.previous > 0
      ? `${model.percent > 0 ? '+' : ''}${model.percent.toFixed(1)}%`
      : null;
  return (
    <div className="overview">
      <div className="page-heading">
        <div>
          <h1>Overview</h1>
          <p className="page-description">Income, spending and dataset health at a glance.</p>
        </div>
        <span className="date-stamp">
          {new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          <span>
            <span className="status-dot" /> All included data
          </span>
        </span>
      </div>
      {model.selection.excluded.length > 0 && (
        <div className="scope-note">
          <i className="bi bi-funnel" aria-hidden="true" />
          <span>
            {model.selection.excluded.length}{' '}
            {model.selection.excluded.length === 1
              ? 'transaction'
              : 'transactions'}{' '}
            excluded from overview and ticker totals.
          </span>
          <button className="text-action" onClick={() => onTab('Analytics')}>
            Review filters <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
      <div className="overview-hero-grid">
        <section className="net-hero" aria-label="All-time cash flow">
          <div className="net-hero-top">
            <span className="eyebrow">ALL-TIME NET FLOW</span>
            <span className="hero-mark" aria-hidden="true">
              <Star />
            </span>
          </div>
          <p className="net-amount" id="overviewNet">
            <Money value={model.net} signed />
          </p>
          <span className="net-caption">
            Income minus expenses.
          </span>
          <div className="net-details">
            <div>
              <span>
                <i className="bi bi-arrow-down-left" aria-hidden="true" /> MONEY
                IN
              </span>
              <strong id="overviewIncome"><Money value={model.income} /></strong>
            </div>
            <div>
              <span>
                <i className="bi bi-arrow-up-right" aria-hidden="true" /> MONEY
                OUT
              </span>
              <strong id="overviewExpenses">
                <Money value={model.expenses} />
              </strong>
            </div>

          </div>
          <CardCallout onClick={() => onAnalytics('overall')}>Explore analytics</CardCallout>
        </section>
        <section className="month-spotlight">
          <div className="panel-kicker">
            <span className="eyebrow">EXPENSES</span>
            <i className="bi bi-calendar3" aria-hidden="true" />
          </div>
          <h2><button type="button" className="month-heading-link" onClick={() => onAnalytics('current_month')}>This month.</button></h2>
          <p className="spotlight-amount"><Money value={model.current} /></p>
          <div className="month-comparison">
            {comparison ? (
              <>
                <span
                  className={`change-pill ${model.percent > 0 ? 'negative' : 'positive'}`}
                >
                  {model.percent > 0 ? '↗' : '↘'} {comparison}
                </span>
                <span>vs. last month</span>
              </>
            ) : (
              <span>No spending last month.</span>
            )}
          </div>
          <div className="month-baseline">
            <span>Last month</span>
            <strong><Money value={model.previous} /></strong>
          </div>
          <CardCallout onClick={() => onAnalytics('current_month')}>Explore this month</CardCallout>
        </section>
      </div>
      <div className="overview-detail-grid">
        <section className="cream-panel flow-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">IN & OUT</p>
              <h2>Cash flow</h2>
            </div>
          </div>
          <p className="muted">Last 12 months</p>
          <AnalyticsChart type="line" model={flowModel} active={active} theme={theme} reducedMotion={reducedMotion} id="overviewCashFlowChart" />
          <CardCallout onClick={() => onAnalytics('last_12_months')}>Explore cash flow</CardCallout>
        </section>
        <section className="cream-panel health-spotlight">
          <div className="panel-kicker">
            <h2>Dataset health</h2>
            <i className="bi bi-shield-check" aria-hidden="true" />
          </div>
          <p className="card-description">Check completeness and classifications.</p>
          <div
            className="health-ring"
            style={{ '--clean-percent': `${cleanPercent}%` }}
          >
            <span>
              {health.total ? `${cleanPercent}%` : '—'}

            </span>
          </div>
          <p className="health-ring-caption">No detected issues</p>
          <p>
            {!health.total
              ? 'No transactions.'
              : health.dirty.length
                ? `${health.dirty.length} ${health.dirty.length === 1 ? 'transaction' : 'transactions'} to review.`
                : 'No records to review.'}
          </p>
          <CardCallout onClick={() => onTab('Dataset Health')}>Review dataset</CardCallout>
        </section>
      </div>
      <section className="cream-panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent transactions</h2>
            <p className="card-description">Latest activity from your file.</p>
          </div>
        </div>
        <div className="recent-list">
          {recent.length ? (
            recent.map((transaction) => (
              <button
                key={transaction.id}
                className="recent-transaction"
                onClick={(event) => onEdit(transaction, event.currentTarget)}
              >
                <span className="recent-icon">
                  <i
                    className={`bi ${getCategoryMeta(transaction.Category).icon}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="recent-description">
                  <strong>
                    {transaction.Description || '(Missing description)'}
                  </strong>
                  <span>
                    {transaction.Category || 'Uncategorized'}
                    {transaction.Subcategory
                      ? ` / ${transaction.Subcategory}`
                      : ''}
                  </span>
                </span>
                <span className="recent-date">
                  {formatDate(transaction.DateTime)}
                </span>
                <strong
                  className={`recent-amount ${Number.isFinite(transaction.Amount) ? (transaction.Amount >= 0 ? 'positive' : 'negative') : 'muted'}`}
                >
                  {Number.isFinite(transaction.Amount)
                    ? <Money value={transaction.Amount} signed />
                    : 'Needs review'}
                </strong>
                <i
                  className="bi bi-arrow-up-right recent-arrow"
                  aria-hidden="true"
                />
              </button>
            ))
          ) : (
            <p className="empty-copy">
              No transactions.
            </p>
          )}
        </div>
        <CardCallout onClick={onViewAll}>View all transactions</CardCallout>
      </section>
    </div>
  );
}
