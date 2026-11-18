import { compareTransactions } from '../../assets/js/transactions.js';
import { formatDate } from '../../assets/js/dateTime.js';
import { formatMoney } from '../../assets/js/presentation.js';
import { getCategoryMeta } from '../../assets/js/categoryMeta.js';

function FlowPreview({ months }) {
  const series = months.slice(-6),
    max = Math.max(
      1,
      ...series.flatMap((month) => [month.income, month.expenses]),
    );
  const x = (index) => 50 + index * (590 / Math.max(1, series.length - 1));
  const y = (value) => 164 - (value / max) * 132;
  const path = (key) =>
    series
      .map((month, i) => `${i ? 'L' : 'M'}${x(i)},${y(month[key])}`)
      .join(' ');
  if (!series.length)
    return (
      <div className="chart-empty">
        <i className="bi bi-activity" aria-hidden="true" />
        <p>Your first transaction starts the picture.</p>
      </div>
    );
  return (
    <svg
      viewBox="0 0 680 206"
      className="flow-preview"
      role="img"
      aria-label={`Recent monthly cash flow: ${series.map((month) => `${month.label}, income ${formatMoney(month.income)}, expenses ${formatMoney(month.expenses)}`).join('; ')}`}
    >
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line
            x1="50"
            x2="650"
            y1={y(max * fraction)}
            y2={y(max * fraction)}
            className="preview-grid"
          />
          <text x="0" y={y(max * fraction) + 4} className="preview-axis">
            {new Intl.NumberFormat('en-GB', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(max * fraction)}
          </text>
        </g>
      ))}
      <path d={path('income')} className="preview-income" />
      <path d={path('expenses')} className="preview-expenses" />
      {series.map((month, i) => (
        <g key={month.key}>
          <circle
            cx={x(i)}
            cy={y(month.income)}
            r="3.5"
            className="preview-income-point"
          />
          <circle
            cx={x(i)}
            cy={y(month.expenses)}
            r="3.5"
            className="preview-expense-point"
          />
          <text x={x(i)} y="197" textAnchor="middle" className="preview-axis">
            {month.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Overview({
  state,
  model,
  health,
  onTab,
  onEdit,
  onViewAll,
}) {
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
          <p className="eyebrow">YOUR MONEY, IN PERSPECTIVE</p>
          <h1>The bigger picture.</h1>
          <p className="page-description">
            A clear view of what comes in, what goes out, and what’s next.
          </p>
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
              ✳
            </span>
          </div>
          <p className="net-amount" id="overviewNet">
            {formatMoney(model.net, true)}
          </p>
          <span className="net-caption">
            The difference between your income and expenses.
          </span>
          <div className="net-details">
            <div>
              <span>
                <i className="bi bi-arrow-down-left" aria-hidden="true" /> MONEY
                IN
              </span>
              <strong id="overviewIncome">{formatMoney(model.income)}</strong>
            </div>
            <div>
              <span>
                <i className="bi bi-arrow-up-right" aria-hidden="true" /> MONEY
                OUT
              </span>
              <strong id="overviewExpenses">
                {formatMoney(model.expenses)}
              </strong>
            </div>
            <button
              className="net-explore"
              onClick={() => onTab('Analytics')}
              aria-label="Explore analytics"
            >
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          </div>
        </section>
        <section className="month-spotlight">
          <div className="panel-kicker">
            <span className="eyebrow">IN THE MOMENT</span>
            <i className="bi bi-calendar3" aria-hidden="true" />
          </div>
          <h2>This month.</h2>
          <p className="spotlight-amount">{formatMoney(model.current)}</p>
          <p className="muted">
            spent in {new Date().toLocaleString('en-GB', { month: 'long' })}
          </p>
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
              <span>No previous-month spending to compare.</span>
            )}
          </div>
          <div className="month-baseline">
            <span>Last month</span>
            <strong>{formatMoney(model.previous)}</strong>
          </div>
        </section>
      </div>
      <div className="overview-detail-grid">
        <section className="cream-panel flow-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">IN & OUT</p>
              <h2>A little perspective.</h2>
            </div>
            <button className="text-action" onClick={() => onTab('Analytics')}>
              Explore analytics <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot income" />
              Income
            </span>
            <span>
              <i className="legend-dot expense" />
              Expenses
            </span>
            <span className="legend-context">Recent months</span>
          </div>
          <FlowPreview months={model.monthly} />
        </section>
        <section className="cream-panel health-spotlight">
          <div className="panel-kicker">
            <span className="eyebrow">DATASET CHECK</span>
            <i className="bi bi-shield-check" aria-hidden="true" />
          </div>
          <div
            className="health-ring"
            style={{ '--clean-percent': `${cleanPercent}%` }}
          >
            <span>
              {health.total ? `${cleanPercent}%` : '—'}
              <small>no issues</small>
            </span>
          </div>
          <h2>
            {!health.total
              ? 'A clean start.'
              : health.dirty.length
                ? 'A few loose ends.'
                : 'Looking good.'}
          </h2>
          <p>
            {!health.total
              ? 'Add a transaction to start checking your dataset.'
              : health.dirty.length
                ? `${health.dirty.length} ${health.dirty.length === 1 ? 'transaction needs' : 'transactions need'} a closer look.`
                : 'No missing fields or classification issues detected.'}
          </p>
          <button
            className="text-action"
            onClick={() => onTab('Dataset Health')}
          >
            Review dataset <span aria-hidden="true">↗</span>
          </button>
        </section>
      </div>
      <section className="cream-panel recent-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RECENT ACTIVITY · ALL RECORDS</p>
            <h2>The latest.</h2>
          </div>
          <button className="text-action" onClick={onViewAll}>
            View all transactions <span aria-hidden="true">↗</span>
          </button>
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
                    ? formatMoney(transaction.Amount, true)
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
              A fresh page. Add your first transaction to make it yours.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
