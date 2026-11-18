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
  state.searchQuery = filter.toLowerCase();
}

export function finishAnalyticsDrilldown(state) {
  const context = state.analyticsReturnContext;
  if (!context) return null;
  state.searchQuery = context.searchQuery;
  state.sort = { ...context.sort };
  if (context.transactionFilters)
    state.transactionFilters = { ...context.transactionFilters };
  state.analyticsReturnContext = null;
  return context;
}
