import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Papa from 'papaparse';
import { parseTransactionsCSV, serializeTransactionsCSV } from '../../assets/js/csv.js';
import { normalizeTags } from '../../assets/js/transactions.js';
import { createAnalyticsExclusions } from '../../assets/js/analyticsScope.js';

export function fileSystemHarness(overrides = {}) {
  const alerts = [], writes = [], statuses = [];
  const state = { transactions: [], originalTransactions: [], analyticsExclusions: createAnalyticsExclusions(),
    fileName: 'expenses.csv', hasUnsavedChanges: false, searchQuery: '' };
  state.fileHandle = { async createWritable() { return {
    async write(csv) { writes.push(csv); }, async close() {}
  }; } };
  const context = vm.createContext({ state, Papa, parseTransactionsCSV, serializeTransactionsCSV,
    normalizeTags, createAnalyticsExclusions, crypto: { randomUUID }, File, Blob,
    console: { log() {}, error() {} }, navigator: {}, window: { showSaveFilePicker: true },
    clearUnsavedChanges() { state.hasUnsavedChanges = false; }, renderApp() {},
    showStatusMessage(message) { statuses.push(message); }, alert(message) { alerts.push(message); },
    confirm: () => true, ...overrides });
  const source = readFileSync(new URL('../../assets/js/fileSystem.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  vm.runInContext(source, context);
  return { context, state, alerts, writes, statuses };
}
