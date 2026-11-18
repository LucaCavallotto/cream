import { createTransactionFilters } from './transactionFilters.js';
import { createAnalyticsExclusions } from './analyticsScope.js';
import {
  beginAnalyticsDrilldown,
  finishAnalyticsDrilldown,
} from './analyticsNavigation.js';
import { normalizeTags } from './transactions.js';

export function createAppState(viewOnlyMode = false) {
  return {
    fileName: '',
    fileHandle: null,
    transactions: [],
    originalTransactions: [],
    hasUnsavedChanges: false,
    categories: {},
    ready: false,
    viewOnlyMode,
    sort: { column: 'Date', direction: 'desc' },
    searchQuery: '',
    searchText: '',
    transactionFilters: createTransactionFilters(),
    tab: 'Overview',
    analyticsExclusions: createAnalyticsExclusions(),
    analyticsReturnContext: null,
    isSelectionMode: false,
    selectedIds: [],
    sessionId: 0,
  };
}

const changed = (state, transactions) => ({
  ...state,
  transactions,
  hasUnsavedChanges: true,
  isSelectionMode: false,
  selectedIds: [],
});

export function appReducer(state, action) {
  switch (action.type) {
    case 'categories':
      return { ...state, categories: action.categories, ready: true };
    case 'open':
      return {
        ...createAppState(state.viewOnlyMode),
        ...action.session,
        categories: state.categories,
        ready: state.ready,
        originalTransactions: structuredClone(action.session.transactions),
        sessionId: state.sessionId + 1,
      };
    case 'close':
      return {
        ...createAppState(state.viewOnlyMode),
        categories: state.categories,
        ready: state.ready,
        sessionId: state.sessionId + 1,
      };
    case 'save':
      return action.sessionId != null && action.sessionId !== state.sessionId
        ? state
        : {
            ...state,
            originalTransactions: structuredClone(action.transactions),
            hasUnsavedChanges:
              JSON.stringify(state.transactions) !==
              JSON.stringify(action.transactions),
          };
    case 'undo':
      return {
        ...state,
        transactions: structuredClone(state.originalTransactions),
        hasUnsavedChanges: false,
        selectedIds: [],
        isSelectionMode: false,
      };
    case 'upsert':
      return changed(
        state,
        action.id
          ? state.transactions.map((t) =>
              t.id === action.id ? action.rows[0] : t,
            )
          : [...state.transactions, ...action.rows],
      );
    case 'delete':
      return changed(
        state,
        state.transactions.filter((t) => !action.ids.includes(t.id)),
      );
    case 'bulk':
      return changed(
        state,
        state.transactions.map((t) => {
          if (!state.selectedIds.includes(t.id)) return t;
          if (action.field === 'Category')
            return {
              ...t,
              Category: action.value,
              Subcategory: state.categories[action.value]?.includes(
                t.Subcategory,
              )
                ? t.Subcategory
                : '',
            };
          if (action.field === 'Subcategory')
            return {
              ...t,
              Category: action.value[0],
              Subcategory: action.value[1],
            };
          return { ...t, Tags: normalizeTags(`${t.Tags} ${action.value}`) };
        }),
      );
    case 'transactionFilters':
      return {
        ...state,
        transactionFilters: action.value,
        selectedIds: [],
        isSelectionMode: false,
      };
    case 'clearTransactionFilters':
      return {
        ...state,
        transactionFilters: createTransactionFilters(),
        searchText: '',
        searchQuery: '',
        selectedIds: [],
        isSelectionMode: false,
      };
    case 'search':
      return {
        ...state,
        selectedIds: [],
        searchText: action.value,
        searchQuery: action.value.trim().toLowerCase(),
      };
    case 'sort':
      return {
        ...state,
        sort: {
          column: action.column,
          direction:
            action.direction ||
            (state.sort.column === action.column &&
            state.sort.direction === 'desc'
              ? 'asc'
              : 'desc'),
        },
      };
    case 'selection':
      return { ...state, isSelectionMode: action.value, selectedIds: [] };
    case 'select':
      return { ...state, selectedIds: action.ids };
    case 'viewOnly':
      return {
        ...state,
        viewOnlyMode: !state.viewOnlyMode,
        isSelectionMode: false,
        selectedIds: [],
      };
    case 'exclusions':
      return { ...state, analyticsExclusions: action.value };
    case 'drilldown': {
      const next = { ...state };
      beginAnalyticsDrilldown(
        next,
        action.filter,
        state.searchText,
        action.scrollY,
      );
      return {
        ...next,
        searchText: action.filter,
        tab: 'Transactions',
        selectedIds: [],
        isSelectionMode: false,
      };
    }
    case 'tab': {
      const next = { ...state, tab: action.tab };
      if (action.tab === 'Analytics') {
        const context = finishAnalyticsDrilldown(next);
        if (context) next.searchText = context.searchText;
      }
      return next;
    }
    default:
      return state;
  }
}
