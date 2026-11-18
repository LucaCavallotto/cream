import { state, clearUnsavedChanges, normalizeTags } from './app.js';
import { renderApp, showStatusMessage } from './ui.js';
import { parseTransactionsCSV, serializeTransactionsCSV } from './csv.js';
import { createAnalyticsExclusions } from './analyticsScope.js';


/**
 * Loads the categories JSON asynchronously.
 */
export async function loadCategories() {
  try {
    const response = await fetch('data/categories.json');
    state.categories = await response.json();
  } catch (error) {
    console.error("Failed to load categories JSON:", error);
  }
}

/**
 * Connects file system related buttons and drop zone to their handlers.
 */
export function setupFileSystemEvents() {
  const btnCreateNewFile = document.getElementById('btnCreateNewFile');
  const btnOpenFile = document.getElementById('btnOpenFile');
  const dropZone = document.getElementById('dropZone');
  const btnSaveChanges = document.getElementById('btnSaveChanges');
  const btnCloseFile = document.getElementById('btnCloseFile');
  const btnUndoChanges = document.getElementById('btnUndoChanges');

  if (btnCreateNewFile) btnCreateNewFile.addEventListener('click', handleCreateNewFile);
  if (btnOpenFile) btnOpenFile.addEventListener('click', handleOpenFilePicker);
  if (btnSaveChanges) btnSaveChanges.addEventListener('click', saveFile);
  if (btnCloseFile) btnCloseFile.addEventListener('click', closeFile);
  if (btnUndoChanges) btnUndoChanges.addEventListener('click', undoChanges);

  // Global Drag & Drop events
  const globalOverlay = document.getElementById('globalDropOverlay');
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (globalOverlay) globalOverlay.classList.remove('d-none');
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (globalOverlay) globalOverlay.classList.add('d-none');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (globalOverlay) globalOverlay.classList.add('d-none');

    if (state.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Opening a new file will discard them. Continue?")) return;
    }

    const item = e.dataTransfer?.items?.[0];
    if (item?.kind === 'file' && item.getAsFileSystemHandle) {
      try {
        const handle = await item.getAsFileSystemHandle();
        if (handle?.kind === 'file') {
          await openFileFromHandle(handle);
          return;
        }
      } catch (error) {
        console.warn('Native drop access unavailable; trying file fallback.', error);
      }
    }
    const file = item?.getAsFile?.() || e.dataTransfer?.files?.[0];
    if (file && parseCSV(await file.text())) {
      state.fileHandle = null;
      state.fileName = file.name;
      state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
      clearUnsavedChanges();
      renderApp();
    }
  });
}

/**
 * Creates a new file using the File System Access API.
 */
async function handleCreateNewFile() {
  try {
    if (window.showSaveFilePicker) {
      const opts = {
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] },
        }],
      };
      // Prompt the user to select where to create the new CSV
      const fileHandle = await window.showSaveFilePicker(opts);
      state.fileHandle = fileHandle;
      state.fileName = fileHandle.name;
    } else {
      // Fallback for iOS / Unsupported browsers
      const fileName = prompt("Enter file name for your new CSV:", "expenses.csv");
      if (!fileName) return; // cancelled
      state.fileHandle = null;
      state.fileName = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
    }
    state.transactions = []; // Empty since it's new
    state.analyticsExclusions = createAnalyticsExclusions();
    state.analyticsReturnContext = null;
    state.originalTransactions = [];
    clearUnsavedChanges();
    renderApp();
  } catch (error) {
    console.error("File creation cancelled or failed", error);
  }
}

/**
 * Opens an existing file using the File System Access API.
 */
async function handleOpenFilePicker() {
  try {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] },
        }],
      });
      await openFileFromHandle(fileHandle);
    } else {
      // Fallback for iOS / Unsupported browsers
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.hidden = true;
      document.body.appendChild(input);
      input.oncancel = () => input.remove();
      input.onchange = async (e) => {
        const file = e.target.files[0];
        input.remove();
        if (!file) return;
        const text = await file.text();
        if (parseCSV(text)) {
          state.fileHandle = null;
          state.fileName = file.name;
          state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
          clearUnsavedChanges();
          renderApp();
        }
      };
      input.click();
    }
  } catch (error) {
    console.error("File open cancelled or failed", error);
  }
}

/**
 * Core function to read file contents and parse them into state.
 */
async function openFileFromHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const text = await file.text();

  if (parseCSV(text)) {
    state.fileHandle = fileHandle;
    state.fileName = fileHandle.name;
    state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));
    clearUnsavedChanges();
    renderApp();
  }
}

/**
 * Parses the raw CSV text using PapaParse.
 */
function parseCSV(csvText) {
  const result = parseTransactionsCSV(csvText, Papa);
  if (result.errors.length) {
    console.error('CSV import failed:', result.errors);
    alert(`Incompatible CSV file. ${result.errors.join(' ')}`);
    return false;
  }
  state.transactions = result.transactions.map(row => ({ id: crypto.randomUUID(), ...row }));

  console.log(`Successfully parsed ${state.transactions.length} transactions.`);
  state.analyticsExclusions = createAnalyticsExclusions();
  state.analyticsReturnContext = null;
  return true;
}

/**
 * Writes the current state.transactions array back to the local file.
 */
export async function saveFile() {
  if (!state.fileHandle && !state.fileName) {
    alert("No file available to save.");
    return;
  }

  try {
    const csvContent = serializeTransactionsCSV(state.transactions, Papa);

    if (state.fileHandle && window.showSaveFilePicker) {
      const writable = await state.fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      showStatusMessage("Changes saved successfully!");
    } else {
      // Fallback for iOS / Unsupported browsers
      const file = new File([csvContent], state.fileName || 'expenses.csv', { type: 'text/csv;charset=utf-8;' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: state.fileName || 'expenses.csv',
          });
          showStatusMessage("File shared/saved successfully!");
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log("Share sheet cancelled by user.");
            // Return early so we don't clear the unsaved changes warning
            return;
          }
          console.error("Share failed", error);
          fallbackDownload(csvContent, state.fileName);
        }
      } else {
        fallbackDownload(csvContent, state.fileName);
      }
    }

    // Commit changes to original state
    state.originalTransactions = JSON.parse(JSON.stringify(state.transactions));

    clearUnsavedChanges();
    renderApp(); // Ensure UI is refreshed and remains in app view
  } catch (error) {
    console.error("Failed to save file", error);
    alert("Failed to save file. Ensure you have granted the necessary permissions.");
  }
}

/**
 * Fallback to standard browser download via anchor tag.
 */
function fallbackDownload(csvContent, fileName) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || 'expenses.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showStatusMessage("File downloaded!");
}

/**
 * Clears the active file and resets the app state back to the landing view.
 */
function closeFile() {
  if (state.hasUnsavedChanges) {
    const confirmClose = confirm("You have unsaved changes. Are you sure you want to close the file?");
    if (!confirmClose) return;
  }

  state.fileHandle = null;
  state.fileName = '';
  state.transactions = [];
  state.analyticsExclusions = createAnalyticsExclusions();
  state.analyticsReturnContext = null;
  state.originalTransactions = [];
  state.searchQuery = '';
  clearUnsavedChanges();
  renderApp();
}

/**
 * Restores the transactions to the original state when the file was opened or last saved.
 */
function undoChanges() {
  if (confirm("Are you sure you want to undo all unsaved changes?")) {
    state.transactions = JSON.parse(JSON.stringify(state.originalTransactions));
    clearUnsavedChanges();
    renderApp();
  }
}
