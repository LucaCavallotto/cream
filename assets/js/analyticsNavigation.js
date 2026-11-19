import { filterAnalyticsPeriod, selectAnalyticsTransactions } from './analyticsScope.js';
import { createTransactionFilters } from './transactionFilters.js';
export function beginAnalyticsDrilldown(state, filter, searchText, scrollY) {
  // Keep the original list context even if a second drilldown is requested.
  state.analyticsReturnContext ??= {
    searchQuery: state.searchQuery,
    searchText,
    sort: { ...state.sort },
    scrollY,
  };
  if (state.transactionFilters) {
    state.analyticsReturnContext.transactionFilters ??= {
      ...state.transactionFilters,
    };
    state.transactionFilters = createTransactionFilters();
  }
  state.analyticsDrilldown = typeof filter === 'object' ? filter : null;
  state.searchQuery = typeof filter === 'string' ? filter.toLowerCase() : '';
  state.searchText = typeof filter === 'string' ? filter : '';
}

export function finishAnalyticsDrilldown(state) {
  const context = state.analyticsReturnContext;
  if (!context) return null;
  state.searchQuery = context.searchQuery;
  state.sort = { ...context.sort };
  if (context.transactionFilters)
    state.transactionFilters = { ...context.transactionFilters };
  state.analyticsDrilldown = null;
  state.analyticsReturnContext = null;
  return context;
}

export function drilldownTransactions(transactions, exclusions, scope) {
  if (!scope) return transactions;
  return filterAnalyticsPeriod(selectAnalyticsTransactions(transactions, exclusions).included, scope.period, scope.month, new Date(scope.now))
    .filter(t => scope.kind === 'tags'
      ? (t.Tags || '').split(/\s+/).includes(scope.tag)
      : (t.Category || 'Uncategorized') === scope.category &&
        (scope.subcategory === undefined || (t.Subcategory || '(No Subcategory)') === scope.subcategory) &&
        (scope.kind === 'income' ? t.Amount > 0 : t.Amount < 0));
}
