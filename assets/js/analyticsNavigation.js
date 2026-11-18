export function beginAnalyticsDrilldown(state, filter, searchText, scrollY) {
  // Keep the original list context even if a second drilldown is requested.
  state.analyticsReturnContext ??= {
    searchQuery: state.searchQuery,
    searchText,
    sort: { ...state.sort },
    scrollY
  };
  state.searchQuery = filter.toLowerCase();
}

export function finishAnalyticsDrilldown(state) {
  const context = state.analyticsReturnContext;
  if (!context) return null;
  state.searchQuery = context.searchQuery;
  state.sort = { ...context.sort };
  state.analyticsReturnContext = null;
  return context;
}
