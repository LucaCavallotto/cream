import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { analyticsModel, chartConfig } from '../../assets/js/analyticsModel.js';
import { isValidTransactionDate } from '../../assets/js/datasetHealth.js';
import AnalyticsFilters from './AnalyticsFilters.jsx';
import { formatMoney } from '../../assets/js/presentation.js';

const euro = formatMoney;

function ChartCard({ type, model, active, theme, reducedMotion }) {
  const canvas = useRef(null),
    instance = useRef(null);
  const title = `${type === 'pie' ? 'Expenses by Category' : 'Monthly Cash Flow Trend'} (${model.periodLabel})`;
  useEffect(() => {
    const chart = new Chart(
      canvas.current,
      chartConfig(type, model, { dark: theme === 'dark', reducedMotion }),
    );
    instance.current = chart;
    return () => {
      instance.current = null;
      chart.destroy();
    };
  }, [type, model, theme, reducedMotion]);
  useEffect(() => {
    if (active) instance.current?.resize();
  }, [active]);
  return (
    <div className="analytics-chart">
      <div className="card shadow-sm h-100">
        <div className="card-header bg-transparent border-bottom-0">
          <h5 className="card-title mb-0">{title}</h5>
        </div>
        <div className="card-body">
          <div style={{ aspectRatio: '2 / 1', position: 'relative' }}>
            <canvas
              style={{ position: 'absolute', inset: 0 }}
              ref={canvas}
              id={type === 'pie' ? 'categoryPieChart' : 'cashFlowLineChart'}
              role="img"
              aria-label={
                type === 'pie'
                  ? `Expenses by category: ${model.pie.map(([name]) => name).join(', ')}`
                  : `Monthly cash flow: ${model.monthly.map((m) => m.label).join(', ')}`
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewTransactions({ name, onDrilldown, small = false }) {
  return (
    <button
      type="button"
      title="View Transactions"
      style={small ? { fontSize: '.75rem' } : undefined}
      className={`btn btn-sm btn-filter-tx ${small ? 'btn-outline-secondary py-0 px-2' : 'btn-link text-muted p-0 ms-1'}`}
      data-filter={name}
      onClick={(e) => {
        e.stopPropagation();
        onDrilldown(name);
      }}
    >
      <i className="bi bi-search" />
    </button>
  );
}

function Breakdown({ kind, groups, periodLabel, onDrilldown }) {
  const [showAll, setShowAll] = useState(false),
    [expanded, setExpanded] = useState(new Set());
  const tag = kind === 'tags',
    income = kind === 'income';
  const title = tag
    ? 'Detailed Tags Breakdown'
    : income
      ? 'Detailed Income Breakdown'
      : 'Detailed Spending Breakdown';
  const listId = tag
    ? 'detailedTagsList'
    : income
      ? 'detailedIncomeList'
      : 'detailedCategoryList';
  const showId = tag
    ? 'btnShowMoreTags'
    : income
      ? 'btnShowMoreIncome'
      : 'btnShowMoreCategories';
  const color = tag ? 'info' : income ? 'success' : 'primary';
  const total = groups.reduce(
    (sum, group) => sum + (tag ? group.volume : group.total),
    0,
  );
  const toggle = (name) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  return (
    <div className="analytics-breakdown">
      <div className="card shadow-sm h-100">
        <div className="card-header bg-transparent border-bottom-0 d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            {title}{' '}
            <small className="text-muted fw-normal">({periodLabel})</small>
          </h5>
          <span
            className={`badge bg-${color}-subtle text-${color} border border-${color}-subtle`}
          >
            {periodLabel}
          </span>
        </div>
        <div className="card-body p-0">
          <div id={listId} className="list-group list-group-flush">
            {groups.length ? (
              groups.slice(0, showAll ? groups.length : 5).map((group) => {
                const percent =
                  total > 0
                    ? ((tag ? group.volume : group.total) / total) * 100
                    : 0;
                return (
                  <div
                    key={group.name}
                    data-breakdown-key={encodeURIComponent(group.name)}
                    className={`category-item list-group-item p-0 border-bottom ${expanded.has(group.name) ? 'expanded' : ''}`}
                  >
                    <div
                      className="category-header d-flex align-items-center"
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded.has(group.name)}
                      aria-label={`Toggle ${group.name} breakdown`}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          ['Enter', ' '].includes(event.key)
                        ) {
                          event.preventDefault();
                          toggle(group.name);
                        }
                      }}
                      onClick={() => toggle(group.name)}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            <span
                              className="fw-bold d-inline-block"
                              style={{ fontSize: '1.1rem' }}
                            >
                              {tag && (
                                <i className="bi bi-tag-fill text-info me-1 small" />
                              )}
                              {group.name}
                            </span>{' '}
                            <ViewTransactions
                              name={group.name}
                              onDrilldown={onDrilldown}
                            />
                            <span className="text-muted small d-block">
                              {tag ? 'Net' : 'Total'} for {periodLabel}
                            </span>
                          </div>
                          <div className="text-end">
                            <span
                              className={`category-amount-badge ${tag && group.total < 0 ? 'text-danger' : 'text-success'}`}
                              style={{ fontSize: '1.1rem', fontWeight: 700 }}
                            >
                              {income || (tag && group.total > 0) ? '+' : ''}
                              {euro(group.total)}
                            </span>
                            <div className="text-muted small">
                              {percent.toFixed(1)}%{tag ? ' of tagged vol' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="category-progress">
                          <div
                            className={`category-progress-bar ${tag ? 'bg-info' : income ? 'bg-success' : ''}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <div className="ms-3">
                        <i className="bi bi-chevron-down chevron-icon text-muted" />
                      </div>
                    </div>
                    <div
                      className={`subcategory-list ${expanded.has(group.name) ? 'show' : ''}`}
                    >
                      {tag ? (
                        <>
                          <div className="subcategory-item d-flex justify-content-between align-items-center">
                            <span className="text-muted">Income</span>
                            <span className="fw-semibold text-success">
                              +{euro(group.income)}
                            </span>
                          </div>
                          <div className="subcategory-item d-flex justify-content-between align-items-center">
                            <span className="text-muted">Expenses</span>
                            <span className="fw-semibold text-danger">
                              -{euro(group.expenses)}
                            </span>
                          </div>
                        </>
                      ) : (
                        group.subcategories.map(([sub, amount]) => (
                          <div
                            key={sub}
                            className="subcategory-item d-flex justify-content-between align-items-center"
                          >
                            <span className="text-muted">{sub}</span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold">
                                {income ? '+' : ''}
                                {euro(amount)}
                              </span>
                              <ViewTransactions
                                name={sub}
                                onDrilldown={onDrilldown}
                                small
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-muted">
                No {tag ? 'tags' : income ? 'income' : 'expenses'} recorded for
                this period.
              </div>
            )}
          </div>
        </div>
        <div
          className={`card-footer bg-transparent border-top-0 text-center pb-3 ${groups.length > 5 ? '' : 'd-none'}`}
        >
          <button
            id={showId}
            className={`btn btn-link text-decoration-none fw-semibold ${kind === 'expenses' ? '' : `text-${color}`}`}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? 'Show Less' : `Show More (${groups.length - 5} others)`}{' '}
            <i className={`bi bi-chevron-${showAll ? 'up' : 'down'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Analytics({
  state,
  dispatch,
  onDrilldown,
  active,
  theme,
  reducedMotion,
}) {
  const [period, setPeriod] = useState('last_12_months'),
    [month, setMonth] = useState('');
  const months = useMemo(
    () =>
      [
        ...new Set(
          state.transactions
            .filter(
              (t) =>
                Number.isFinite(t.Amount) && isValidTransactionDate(t.DateTime),
            )
            .map((t) => {
              const d = new Date(t.DateTime);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }),
        ),
      ]
        .sort()
        .reverse(),
    [state.transactions],
  );
  const selectedMonth = months.includes(month) ? month : months[0] || '';
  const model = useMemo(
    () =>
      analyticsModel(
        state.transactions,
        state.analyticsExclusions,
        period,
        selectedMonth,
      ),
    [state.transactions, state.analyticsExclusions, period, selectedMonth],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE WHY BEHIND THE NUMBERS</p>
          <h1>Follow the flow.</h1>
          <p className="page-description">
            Patterns, perspective, and a little more peace of mind.
          </p>
        </div>
        <div className="analytics-period-controls">
          <label
            htmlFor="analyticsTimePeriod"
            className="form-label mb-0 text-nowrap fw-semibold small text-muted text-uppercase"
          >
            Time Period:
          </label>
          <select
            id="analyticsTimePeriod"
            className="form-select shadow-sm"
            style={{ maxWidth: 200 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {[
              ['overall', 'Overall'],
              ['current_month', 'Current Month'],
              ['specific_month', 'Specific Month...'],
              ['last_3_months', 'Last 3 Months'],
              ['last_6_months', 'Last 6 Months'],
              ['last_12_months', 'Last 12 Months'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div
            id="monthSelectContainer"
            className={period === 'specific_month' ? '' : 'd-none'}
          >
            <select
              id="analyticsSpecificMonth"
              aria-label="Specific month"
              className="form-select shadow-sm"
              style={{ maxWidth: 180 }}
              value={selectedMonth}
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((value) => (
                <option key={value} value={value}>
                  {new Date(`${value}-01T12:00:00`).toLocaleString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <AnalyticsFilters
        transactions={state.transactions}
        exclusions={state.analyticsExclusions}
        onChange={(value) => dispatch({ type: 'exclusions', value })}
        model={model}
      />
      <div
        id="analyticsNoData"
        className={`alert alert-secondary ${model.rows.length ? 'd-none' : ''}`}
        role="status"
      >
        No transactions remain for the selected period and exclusions.
      </div>
      <div className="analytics-summary">
        <div className="analytics-net">
          <p className="eyebrow">NET FLOW · {model.periodLabel}</p>
          <h2
            id="metricDelta"
            className={model.net >= 0 ? 'positive' : 'negative'}
          >
            {model.net >= 0 ? '+' : '-'}
            {euro(Math.abs(model.net))}
          </h2>
        </div>
        <div className="analytics-in-out">
          <div>
            <span className="eyebrow">↙ MONEY IN</span>
            <h2 id="metricIncome" className="positive">
              {euro(model.income)}
            </h2>
          </div>
          <div>
            <span className="eyebrow">↗ MONEY OUT</span>
            <h2 id="metricExpenses" className="negative">
              {euro(model.expenses)}
            </h2>
          </div>
        </div>
        <div className="analytics-comparison">
          <p className="eyebrow">MONTHLY SPEND COMPARISON</p>
          <div>
            <span>Current month</span>
            <strong id="metricCurrentMonth">
              {euro(model.current)}{' '}
              <span
                id="metricComparisonPercent"
                className={
                  model.current > model.previous ? 'negative' : 'positive'
                }
              >
                ({model.percent >= 0 ? '+' : ''}
                {model.percent.toFixed(1)}%)
              </span>
            </strong>
          </div>
          <div>
            <span>Previous month</span>
            <strong id="metricPrevMonth">{euro(model.previous)}</strong>
          </div>
        </div>
      </div>
      <div className="analytics-charts">
        <ChartCard
          type="line"
          model={model}
          active={active}
          theme={theme}
          reducedMotion={reducedMotion}
        />
        <ChartCard
          type="pie"
          model={model}
          active={active}
          theme={theme}
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="analytics-breakdowns">
        <Breakdown
          kind="expenses"
          groups={model.spending}
          periodLabel={model.periodLabel}
          onDrilldown={onDrilldown}
        />
        <Breakdown
          kind="income"
          groups={model.incomeGroups}
          periodLabel={model.periodLabel}
          onDrilldown={onDrilldown}
        />
        <Breakdown
          kind="tags"
          groups={model.tags}
          periodLabel={model.periodLabel}
          onDrilldown={onDrilldown}
        />
      </div>
    </>
  );
}
