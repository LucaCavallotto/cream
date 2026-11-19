import { createTransactionId } from './transactionId.js';
import Papa from 'papaparse';
import { parseTransactionsCSV, serializeTransactionsCSV } from './csv.js';

export async function readCSVSession(source, { isDemo = false } = {}) {
  const handle = typeof source.getFile === 'function' ? source : null;
  const file = handle ? await handle.getFile() : source;
  const result = parseTransactionsCSV(await file.text(), Papa);
  if (result.errors.length)
    throw new Error(`Incompatible CSV file. ${result.errors.join(' ')}`);
  return {
    isDemo,
    fileName: file.name || source.name,
    fileHandle: handle,
    transactions: result.transactions.map((row) => ({
      id: createTransactionId(),
      ...row,
    })),
  };
}

export async function createCSVSession(environment = globalThis) {
  if (environment.showSaveFilePicker) {
    const handle = await environment.showSaveFilePicker({
      types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
    });
    return { fileName: handle.name, fileHandle: handle, transactions: [] };
  }
  const name = environment.prompt(
    'Enter file name for your new CSV:',
    'expenses.csv',
  );
  return name
    ? {
        fileName: name.endsWith('.csv') ? name : name + '.csv',
        fileHandle: null,
        transactions: [],
      }
    : null;
}

export async function pickCSVHandle(environment = globalThis) {
  const [handle] = await environment.showOpenFilePicker({
    types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
  });
  return handle;
}

export async function droppedCSVSource(transfer) {
  const item = transfer?.items?.[0];
  if (item?.kind === 'file' && item.getAsFileSystemHandle) {
    try {
      const handle = await item.getAsFileSystemHandle();
      if (handle?.kind === 'file') return handle;
    } catch {
      /* A readable File may still be available without a writable handle. */
    }
  }
  return item?.getAsFile?.() || transfer?.files?.[0] || null;
}

export function downloadCSV(content, name, environment = globalThis) {
  const url = environment.URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8;' }),
  );
  const link = environment.document.createElement('a');
  link.href = url;
  link.download = name;
  // Keep downloads out of the app's browsing context and its unload guard.
  link.target = '_blank';
  link.rel = 'noopener';
  environment.document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to consume the URL before releasing it.
  environment.setTimeout(() => environment.URL.revokeObjectURL(url), 1000);
}

export async function saveCSVSession(
  session,
  environment = globalThis,
  download = downloadCSV,
) {
  if (session.isDemo) throw new Error('Demo edits are temporary. Saving or exporting the built-in demo is unavailable. Open your own CSV to keep changes.');
  if (!session.fileName && !session.fileHandle)
    throw new Error('No file available to save.');
  const content = serializeTransactionsCSV(session.transactions, Papa);
  if (session.fileHandle && environment.showSaveFilePicker) {
    const writable = await session.fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return { saved: true, method: 'native' };
  }
  const file = new File([content], session.fileName || 'expenses.csv', {
    type: 'text/csv;charset=utf-8;',
  });
  if (environment.navigator?.canShare?.({ files: [file] })) {
    try {
      await environment.navigator.share({
        files: [file],
        title: session.fileName,
      });
      return { saved: true, method: 'share' };
    } catch (error) {
      if (error.name === 'AbortError') return { saved: false, method: 'share' };
    }
  }
  download(content, session.fileName || 'expenses.csv', environment);
  return { saved: true, method: 'download' };
}
