import { buildCatalog } from './classificationCatalog.js';
import { createTransactionFilters } from './transactionFilters.js';
import { createAnalyticsExclusions } from './analyticsScope.js';
import {
  beginAnalyticsDrilldown,
  finishAnalyticsDrilldown,
} from './analyticsNavigation.js';
import { normalizeTags } from './transactions.js';

export function createAppState(viewOnlyMode = false, deviceReadOnly = false) {
  return {
    fileName: '',
    isDemo: false,
    fileHandle: null,
    transactions: [],
    originalTransactions: [],
    hasUnsavedChanges: false,
    pendingDownload: null,
    categories: {},
    suggestedCategories: {},
    catalogAdditions: {},
    ready: false,
    viewOnlyMode,
    deviceReadOnly,
    sort: { column: 'Date', direction: 'desc' },
    searchQuery: '',
    searchText: '',
    transactionFilters: createTransactionFilters(),
    tab: 'Overview',
    analyticsPeriod: 'last_12_months',
    analyticsExclusions: createAnalyticsExclusions(),
    analyticsReturnContext: null,
    analyticsDrilldown: null,
    isSelectionMode: false,
    selectedIds: [],
    sessionId: 0,
  };
}

const changed = (state, transactions) => ({
  ...state,
  transactions,
  categories: buildCatalog(state.suggestedCategories, transactions, state.catalogAdditions),
  hasUnsavedChanges: true,
  isSelectionMode: false,
  selectedIds: [],
});

const demoWriteActions = new Set(['addClassification', 'upsert', 'delete', 'bulk', 'undo', 'selection', 'select']);

export function appReducer(state, action) {
  if (state.isDemo && demoWriteActions.has(action.type)) return state;
  switch (action.type) {
    case 'categories':
      return { ...state, suggestedCategories: action.categories, categories: buildCatalog(action.categories, state.transactions, state.catalogAdditions), ready: true };
    case 'addClassification': {
      const catalogAdditions = buildCatalog(state.catalogAdditions, [], { [action.category]: action.subcategory ? [action.subcategory] : [] });
      return { ...state, catalogAdditions, categories: buildCatalog(state.suggestedCategories, state.transactions, catalogAdditions) };
    }
    case 'open':
      return {
        ...createAppState(state.viewOnlyMode, state.deviceReadOnly),
        ...action.session,
        viewOnlyMode: Boolean(action.session.isDemo) || state.deviceReadOnly || action.editable !== true,
        suggestedCategories: state.suggestedCategories,
        categories: buildCatalog(state.suggestedCategories, action.session.transactions),
        ready: state.ready,
        originalTransactions: structuredClone(action.session.transactions),
        sessionId: state.sessionId + 1,
      };
    case 'close':
      return {
        ...createAppState(state.viewOnlyMode, state.deviceReadOnly),
        suggestedCategories: state.suggestedCategories,
        categories: buildCatalog(state.suggestedCategories),
        ready: state.ready,
        sessionId: state.sessionId + 1,
      };
    case 'downloadPending':
      return action.sessionId === state.sessionId && !state.isDemo
        ? { ...state, pendingDownload: { transactions: structuredClone(action.transactions), sessionId: action.sessionId } }
        : state;
    case 'downloadDismiss':
      return { ...state, pendingDownload: null };
    case 'save':
      if (state.isDemo) return state;
      return action.sessionId != null && action.sessionId !== state.sessionId
        ? state
        : {
            ...state,
            pendingDownload: null,
            originalTransactions: structuredClone(action.transactions),
            hasUnsavedChanges:
              JSON.stringify(state.transactions) !==
              JSON.stringify(action.transactions),
          };
    case 'undo':
      return {
        ...state,
        pendingDownload: null,
        transactions: structuredClone(state.originalTransactions),
        categories: buildCatalog(state.suggestedCategories, state.originalTransactions, state.catalogAdditions),
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
          if (action.field === 'NeedWant') return { ...t, NeedWant: ['', 'need', 'want'].includes(action.value) ? action.value : (t.NeedWant || '') };
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
        analyticsDrilldown: null,
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
      if (state.deviceReadOnly || state.isDemo) return state;
      return {
        ...state,
        viewOnlyMode: !state.viewOnlyMode,
        isSelectionMode: false,
        selectedIds: [],
      };
    case 'analyticsPeriod':
      return { ...state, analyticsPeriod: action.value };
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
        searchText: typeof action.filter === 'string' ? action.filter : '',
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
