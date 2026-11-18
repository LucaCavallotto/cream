import { state, markUnsavedChanges, normalizeTags } from './app.js';
import { renderAnalytics } from './analytics.js';
import { parseInlineRow } from './inlineInput.js';
import { renderDatasetHealth } from './cleanup.js';
import { getTransactionIssues, isValidTransactionDate } from './datasetHealth.js';

const categoryMap = {
  'food': { icon: 'bi-cup-hot-fill', color: 'bg-danger' },
  'dining': { icon: 'bi-shop', color: 'bg-danger' },
  'restaurant': { icon: 'bi-shop', color: 'bg-danger' },
  'rent': { icon: 'bi-house-fill', color: 'bg-warning text-dark' },
  'housing': { icon: 'bi-house-fill', color: 'bg-warning text-dark' },
  'phone': { icon: 'bi-telephone-fill', color: 'bg-primary' },
  'utilities': { icon: 'bi-lightning-charge-fill', color: 'bg-primary' },
  'transport': { icon: 'bi-car-front-fill', color: 'bg-success' },
  'entertainment': { icon: 'bi-film', color: 'text-bg-secondary' },
  'shopping': { icon: 'bi-bag-fill', color: 'bg-danger' },
  'health': { icon: 'bi-heart-pulse-fill', color: 'bg-danger' },
  'kids': { icon: 'bi-person-hearts', color: 'bg-info' },
  'insurance': { icon: 'bi-shield-fill-check', color: 'bg-warning text-dark' }, /* Based on image "Assicurazione" is orange */
  'software': { icon: 'bi-laptop', color: 'bg-primary' },
  'default': { icon: 'bi-receipt-cutoff', color: 'bg-secondary' }
};

function getCategoryMeta(category) {
  if (!category) return categoryMap['default'];
  const lower = category.toLowerCase();
  for (const key in categoryMap) {
    if (lower.includes(key)) return categoryMap[key];
  }
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info', 'bg-secondary'];
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { icon: 'bi-tag-fill', color: colors[hash % colors.length] };
}

let expenseModalInstance = null;

/**
 * Returns the current system timezone offset in ±HH:mm format.
 */
function getTimezoneOffset(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const absOffset = Math.abs(offset);
  const h = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const m = String(absOffset % 60).padStart(2, '0');
  return (offset >= 0 ? '+' : '-') + h + ':' + m;
}

/**
 * Parses a string into a full ISO 8601 DateTime string with timezone.
 */
function parseInlineDate(dateStr) {
  if (!dateStr) return '';

  // Check if it's already a full ISO string (with T and optional timezone)
  if (dateStr.includes('T')) {
    // If it has T but no timezone offset/Z, append system timezone
    if (!dateStr.match(/(?:Z|[+-]\d{2}:?\d{2})$/)) {
      return dateStr + getTimezoneOffset(new Date(dateStr));
    }
    return dateStr;
  }

  // If it's just a date YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const d = new Date(dateStr);
    return `${dateStr}T00:00:00${getTimezoneOffset(d)}`;
  }

  return '';
}

/**
 * Initializes listeners for DOM elements related to the UI layer.
 */
export function setupUIEvents() {
  const modalElement = document.getElementById('expenseModal');
  if (modalElement) {
    expenseModalInstance = new bootstrap.Modal(modalElement);
    // Reset form every time the modal closes
    modalElement.addEventListener('hidden.bs.modal', resetForm);
  }

  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleTransactionSubmit);
  }

  const inlineInput = document.getElementById('inlineInput');
  if (inlineInput) {
    inlineInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!val) {
        document.getElementById('inputDate').required = true;
        document.getElementById('inputAmount').required = true;
        document.getElementById('inputDescription').required = true;
        showInlineFeedback([]);
        return;
      }

      const parsed = parseInlineInput(val);
      showInlineFeedback([...parsed.errors, ...parsed.warnings]);

      // If multiple lines, make standard fields non-mandatory so the form can submit
      const isMultiLine = parsed.rows.length > 1;
      document.getElementById('inputDate').required = !isMultiLine;
      document.getElementById('inputAmount').required = !isMultiLine;
      document.getElementById('inputDescription').required = !isMultiLine;

      const first = parsed.rows[0];
      if (!first) return;
      const transaction = first.transaction;
      {
        const isoStr = parseInlineDate(transaction.DateTime);
        if (isoStr) {
          const [d, tPart] = isoStr.split('T');
          document.getElementById('inputDate').value = d;
          const timeInput = document.getElementById('inputTime');
          if (timeInput && tPart) {
            timeInput.value = tPart.substring(0, 8); // Take HH:mm:ss
          }
        }
      }

      document.getElementById('inputAmount').value = transaction.Amount;
      document.getElementById('inputDescription').value = transaction.Description;
      if (first.hasCategory) {
        document.getElementById('inputCategory').value = transaction.Category;
        // Explicit invalid or empty classifications must not inherit stale form values.
        document.getElementById('inputSubcategory').value = transaction.Subcategory
          ? JSON.stringify([transaction.Category, transaction.Subcategory]) : '';
      }
    });
  }

  const btnDelete = document.getElementById('btnDeleteTransactionModal');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      const id = document.getElementById('editTransactionId').value;
      if (id) {
        deleteTransaction(id);
        if (expenseModalInstance) expenseModalInstance.hide();
      }
    });
  }

  const inputCategory = document.getElementById('inputCategory');
  if (inputCategory) {
    inputCategory.addEventListener('change', handleCategoryChange);
  }

  const inputSubcategory = document.getElementById('inputSubcategory');
  if (inputSubcategory) {
    inputSubcategory.addEventListener('change', handleSubcategoryChange);
  }



  // Attach sorting events to sortable headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (state.sort.column === column) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.column = column;
        state.sort.direction = 'desc';
      }
      renderTransactions();
    });
  });

  document.addEventListener('filter-transactions-requested', () => {
    renderTransactions();
    const listTab = document.getElementById('list-tab');
    if (listTab) {
      listTab.click();
    }
  });

  const inputSearchTransaction = document.getElementById('inputSearchTransaction');
  const btnClearSearch = document.getElementById('btnClearSearch');
  if (inputSearchTransaction && btnClearSearch) {
    inputSearchTransaction.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      btnClearSearch.classList.toggle('d-none', !e.target.value);
      renderTransactions();
    });

    btnClearSearch.addEventListener('click', () => {
      inputSearchTransaction.value = '';
      state.searchQuery = '';
      btnClearSearch.classList.add('d-none');
      inputSearchTransaction.focus();
      renderTransactions();
    });
  }

  // Tags Suggestions (Modal)
  const inputTags = document.getElementById('inputTags');
  if (inputTags) {
    inputTags.addEventListener('input', () => showTagSuggestions('inputTags', 'tagsSuggestionBox'));
    inputTags.addEventListener('focus', () => showTagSuggestions('inputTags', 'tagsSuggestionBox'));
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!inputTags.contains(e.target) && !document.getElementById('tagsSuggestionBox').contains(e.target)) {
        document.getElementById('tagsSuggestionBox').classList.add('d-none');
      }
    });
  }

  // Tags Suggestions (Bulk)
  const bulkTagsInput = document.getElementById('bulkTagsInput');
  if (bulkTagsInput) {
    bulkTagsInput.addEventListener('input', () => showTagSuggestions('bulkTagsInput', 'bulkTagsSuggestionBox'));
    bulkTagsInput.addEventListener('focus', () => showTagSuggestions('bulkTagsInput', 'bulkTagsSuggestionBox'));
    document.addEventListener('click', (e) => {
      if (!bulkTagsInput.contains(e.target) && !document.getElementById('bulkTagsSuggestionBox').contains(e.target)) {
        document.getElementById('bulkTagsSuggestionBox').classList.add('d-none');
      }
    });
  }

  // Selection Mode Events
  const btnSelectMode = document.getElementById('btnSelectMode');
  if (btnSelectMode) {
    btnSelectMode.addEventListener('click', () => toggleSelectionMode(true));
  }

  const btnCancelSelection = document.getElementById('btnCancelSelection');
  if (btnCancelSelection) {
    btnCancelSelection.addEventListener('click', () => toggleSelectionMode(false));
  }

  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        state.selectedIds = state.transactions.map(t => t.id);
      } else {
        state.selectedIds = [];
      }
      renderTransactions();
      updateSelectedCount();
    });
  }

  const btnBulkDelete = document.getElementById('btnBulkDelete');
  if (btnBulkDelete) {
    btnBulkDelete.addEventListener('click', handleBulkDelete);
  }

  const btnBulkApplyCategory = document.getElementById('btnBulkApplyCategory');
  if (btnBulkApplyCategory) {
    btnBulkApplyCategory.addEventListener('click', handleBulkApplyCategory);
  }

  const btnBulkApplySubcategory = document.getElementById('btnBulkApplySubcategory');
  if (btnBulkApplySubcategory) {
    btnBulkApplySubcategory.addEventListener('click', handleBulkApplySubcategory);
  }

  const btnBulkApplyTags = document.getElementById('btnBulkApplyTags');
  if (btnBulkApplyTags) {
    btnBulkApplyTags.addEventListener('click', handleBulkApplyTags);
  }

  // View Only Mode Toggle
  const btnToggleViewOnly = document.getElementById('btnToggleViewOnly');
  if (btnToggleViewOnly) {
    btnToggleViewOnly.addEventListener('click', () => {
      state.viewOnlyMode = !state.viewOnlyMode;
      renderApp();
    });
  }
}

/**
 * Toggles the main visibility between the landing screen and the app dashboard.
 */
export function renderApp() {
  const landingView = document.getElementById('landingView');
  const appView = document.getElementById('appView');
  const navActions = document.getElementById('navActions');
  const currentFileName = document.getElementById('currentFileName');

  if (state.fileName) {
    // A file is open
    landingView.classList.add('d-none');
    appView.classList.remove('d-none');
    navActions.classList.remove('d-none');
    currentFileName.textContent = state.fileName;

    // View Only Mode specific UI handling
    const textViewOnly = document.getElementById('textViewOnly');
    const btnUndo = document.getElementById('btnUndoChanges');
    const btnSave = document.getElementById('btnSaveChanges');
    const btnToggleViewOnly = document.getElementById('btnToggleViewOnly');
    const btnAddExpense = document.getElementById('btnAddExpense');
    const btnSelectMode = document.getElementById('btnSelectMode');
    const inputSearchTransaction = document.getElementById('inputSearchTransaction');

    if (state.viewOnlyMode) {
      if (textViewOnly) textViewOnly.classList.remove('d-none');
      if (btnUndo) btnUndo.classList.add('d-none');
      if (btnSave) btnSave.classList.add('d-none');
      if (btnAddExpense) btnAddExpense.classList.add('d-none');
      if (btnSelectMode) btnSelectMode.classList.add('d-none');
      if (btnToggleViewOnly) btnToggleViewOnly.innerHTML = '<i class="bi bi-lock-fill text-warning"></i>';
      if (inputSearchTransaction && inputSearchTransaction.parentElement) {
         inputSearchTransaction.parentElement.classList.replace('w-100', 'w-auto'); // Adjust search bar layout
      }
      
      if (state.isSelectionMode) toggleSelectionMode(false);
    } else {
      if (textViewOnly) textViewOnly.classList.add('d-none');
      if (btnUndo) btnUndo.classList.remove('d-none');
      if (btnSave) btnSave.classList.remove('d-none');
      if (btnAddExpense) btnAddExpense.classList.remove('d-none');
      if (btnSelectMode) btnSelectMode.classList.remove('d-none');
      if (btnToggleViewOnly) btnToggleViewOnly.innerHTML = '<i class="bi bi-unlock-fill"></i>';
      if (inputSearchTransaction && inputSearchTransaction.parentElement) {
         inputSearchTransaction.parentElement.classList.replace('w-auto', 'w-100');
      }
    }

    populateCategoriesDropdown();
    updateAllTags();
    renderTransactions();
  } else {
    // No file is open
    landingView.classList.remove('d-none');
    appView.classList.add('d-none');
    navActions.classList.add('d-none');
    currentFileName.textContent = '';

    // Clear search input on close
    const inputSearch = document.getElementById('inputSearchTransaction');
    if (inputSearch) inputSearch.value = '';
    const btnClear = document.getElementById('btnClearSearch');
    if (btnClear) btnClear.classList.add('d-none');

    toggleSelectionMode(false);
  }
}

/**
 * Fills the category dropdown from the loaded JSON data.
 */
function populateCategoriesDropdown() {
  const select = document.getElementById('inputCategory');
  const bulkSelect = document.getElementById('bulkCategorySelect');
  const bulkSubSelect = document.getElementById('bulkSubcategorySelect');

  const options = '<option value="" disabled selected>Select Category</option>';
  const bulkOptions = '<option value="" disabled selected>Choose...</option>';
  const bulkSubOptions = '<option value="" disabled selected>Choose...</option>';

  let optionsHtml = '';
  Object.keys(state.categories).forEach(cat => {
    optionsHtml += `<option value="${cat}">${cat}</option>`;
  });

  if (select) select.innerHTML = options + optionsHtml;
  if (bulkSelect) bulkSelect.innerHTML = bulkOptions + optionsHtml;
  populateSubcategoriesDropdown();

  if (bulkSubSelect) {
    let bulkSubHtml = bulkSubOptions;
    Object.keys(state.categories).forEach(cat => {
      const subs = state.categories[cat];
      if (subs && subs.length > 0) {
        bulkSubHtml += `<optgroup label="${cat}">`;
        subs.forEach(sub => {
          bulkSubHtml += `<option value="${cat}|${sub}">${sub}</option>`;
        });
        bulkSubHtml += `</optgroup>`;
      }
    });
    bulkSubSelect.innerHTML = bulkSubHtml;
  }
}

/**
 * Keeps every category/subcategory pair available, including an imported value
 * when editing a transaction whose classification is absent from the catalog.
 */
function populateSubcategoriesDropdown(transaction = null) {
  const subSelect = document.getElementById('inputSubcategory');
  subSelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';

  const categories = Object.fromEntries(
    Object.entries(state.categories).map(([category, subs]) => [category, [...subs]])
  );
  if (transaction && transaction.Subcategory) {
    const subs = categories[transaction.Category] || [];
    if (!subs.includes(transaction.Subcategory)) subs.push(transaction.Subcategory);
    categories[transaction.Category] = subs;
  }

  Object.entries(categories).forEach(([category, subs]) => {
    if (!subs.length) return;
    const group = document.createElement('optgroup');
    group.label = category || '(No Category)';
    subs.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify([category, sub]);
      opt.dataset.category = category;
      opt.dataset.subcategory = sub;
      opt.textContent = sub;
      group.appendChild(opt);
    });
    subSelect.appendChild(group);
  });
}

function handleCategoryChange(e) {
  const subSelect = document.getElementById('inputSubcategory');
  const option = subSelect.selectedOptions[0];
  if (option && option.dataset.category !== e.target.value) {
    subSelect.value = '';
  }
}

function handleSubcategoryChange(e) {
  const option = e.target.selectedOptions[0];
  if (option && option.dataset.category !== undefined) {
    document.getElementById('inputCategory').value = option.dataset.category;
  }
}

/**
 * Resets the modal form inputs back to defaults.
 */
function resetForm() {
  document.getElementById('expenseForm').reset();
  document.getElementById('editTransactionId').value = '';
  document.getElementById('inlineInput').value = '';
  document.getElementById('expenseModalLabel').textContent = 'Add Transaction';
  populateCategoriesDropdown();
  showInlineFeedback([]);
  document.getElementById('transactionHealthIssues').classList.add('d-none');

  document.getElementById('inputDate').required = true;
  document.getElementById('inputAmount').required = true;
  document.getElementById('inputDescription').required = true;

  const btnDelete = document.getElementById('btnDeleteTransactionModal');
  if (btnDelete) btnDelete.classList.add('d-none');

  // Reset disabled states and show save button
  const inputs = ['inputDate', 'inputTime', 'inputAmount', 'inputDescription', 'inputCategory', 'inputSubcategory', 'inputTags', 'inputNotes', 'inlineInput'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  
  const btnSave = document.getElementById('btnSaveTransaction');
  if (btnSave) btnSave.classList.remove('d-none');
}



/**
 * Formats an ISO 8601 string into a human-readable format.
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date)) return isoString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Renders the transactions table in sorted order.
 */
export function renderTransactions() {
  renderDatasetHealth(state, editTransaction);
  const tbody = document.getElementById('transactionsTbody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.getElementById('transactionsTable').parentElement;

  let filteredTransactions = state.transactions;
  if (state.searchQuery) {
    filteredTransactions = state.transactions.filter(t =>
      t.Description.toLowerCase().includes(state.searchQuery) ||
      t.Amount.toString().includes(state.searchQuery) ||
      (t.Category || '').toLowerCase().includes(state.searchQuery) ||
      (t.Subcategory || '').toLowerCase().includes(state.searchQuery) ||
      (t.Tags || '').toLowerCase().includes(state.searchQuery) ||
      (t.Notes || '').toLowerCase().includes(state.searchQuery)
    );
  }

  if (filteredTransactions.length === 0) {
    tableContainer.classList.add('d-none');
    emptyState.classList.remove('d-none');
  } else {
    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
  }

  const thActions = document.getElementById('thActions');
  if (thActions) {
    if (state.viewOnlyMode) {
      thActions.classList.add('d-none');
      thActions.classList.remove('d-md-table-cell');
    } else {
      thActions.classList.remove('d-none');
      thActions.classList.add('d-md-table-cell');
    }
  }

  // Copy and sort the data based on current state parameters
  const sorted = [...filteredTransactions].sort((a, b) => {
    const col = state.sort.column;
    const dir = state.sort.direction === 'asc' ? 1 : -1;

    if (col === 'Amount') {
      return (a.Amount - b.Amount) * dir;
    } else if (col === 'Date') {
      const dateA = a.DateTime || '';
      const dateB = b.DateTime || '';
      return dateA.localeCompare(dateB) * dir;
    } else {
      return (a[col] || '').localeCompare(b[col] || '') * dir;
    }
  });

  tbody.innerHTML = '';

  let lastYear = null;
  let lastMonth = null;
  let lastDate = null;
  const isDateSorted = state.sort.column === 'Date';

  // Build and insert DOM rows
  let txCounter = 0;
  sorted.forEach((t) => {
    try {
      if (isDateSorted && t.DateTime) {
        const year = t.DateTime.substring(0, 4);
        const month = t.DateTime.substring(5, 7);

        if (year !== lastYear) {
          const yearTr = document.createElement('tr');
          yearTr.className = 'year-divider-row divider-row';
          yearTr.innerHTML = `
            <td colspan="9" class="p-2 text-center text-muted fw-bold small text-uppercase border-0">
              — ${year} —
            </td>
          `;
          tbody.appendChild(yearTr);
          lastYear = year;
          lastMonth = null; // Reset month when year changes
        }

        if (month !== lastMonth) {
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const monthName = monthNames[parseInt(month, 10) - 1] || month;

          const monthTr = document.createElement('tr');
          monthTr.className = 'month-divider-row divider-row';
          monthTr.innerHTML = `
            <td colspan="9" class="px-3 py-2 text-primary fw-semibold small text-uppercase border-0" style="background-color: var(--bs-secondary-bg); opacity: 0.9;">
              ${monthName}
            </td>
          `;
          tbody.appendChild(monthTr);
          lastMonth = month;
        }
      }

      const tr = document.createElement('tr');
      tr.className = 'mobile-row-click';
      if (txCounter % 2 === 1) tr.classList.add('bg-body-tertiary');
      tr.setAttribute('data-id', t.id);
      txCounter++;

      const isIncome = t.Amount >= 0;
      const validAmount = Number.isFinite(t.Amount);
      const amountStr = validAmount ? `${isIncome ? '+' : ''}${t.Amount.toFixed(2)} €` : 'Invalid / missing amount';
      const amountClass = !validAmount ? 'text-warning fw-bold' : isIncome ? 'text-success fw-bold' : 'text-danger fw-bold';
      const meta = getCategoryMeta(t.Category);
      const isSelected = state.selectedIds.includes(t.id);

      tr.innerHTML = `
        <!-- Selection Checkbox -->
        <td class="selection-column ${state.isSelectionMode ? '' : 'd-none'} text-center">
          <input type="checkbox" class="form-check-input transaction-checkbox" data-id="${t.id}" ${isSelected ? 'checked' : ''}>
        </td>

        <!-- Desktop Layout -->
        <td class="d-none d-md-table-cell">${formatDate(t.DateTime)}</td>
        <td class="d-none d-md-table-cell ${amountClass}">${amountStr}</td>
        <td class="d-none d-md-table-cell">${t.Description}</td>
        <td class="d-none d-lg-table-cell"><span class="badge bg-secondary">${t.Category || 'Uncategorized'}</span></td>
        <td class="d-none d-lg-table-cell">${t.Subcategory}</td>
        <td class="d-none d-xl-table-cell">${(t.Tags || '').split(/\s+/).filter(tag => tag.trim()).map(tag => `<span class="badge rounded-pill text-bg-light border text-dark me-1" style="font-weight: 500;">${tag.trim()}</span>`).join('')}</td>
        <td class="d-none d-xl-table-cell">${t.Notes}</td>
        ${state.viewOnlyMode ? '' : `
        <td class="text-end text-nowrap d-none d-md-table-cell">
          <button class="btn btn-sm btn-outline-primary me-1 btn-edit ${state.isSelectionMode ? 'd-none' : ''}" data-id="${t.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger btn-del ${state.isSelectionMode ? 'd-none' : ''}" data-id="${t.id}">Del</button>
        </td>
        `}
        
        <!-- Mobile Layout -->
        <td class="d-md-none mobile-visible w-100 p-0 border-0">
          <div class="d-flex align-items-center w-100 p-2 ${isSelected && state.isSelectionMode ? 'bg-primary-subtle' : ''}">
            <div style="width: 44px; flex-shrink: 0;">
              <div class="category-icon shadow-sm ${meta.color}">
                <i class="bi ${meta.icon}"></i>
              </div>
            </div>
            <div class="flex-grow-1 ms-3 overflow-hidden" style="min-width: 0;">
              <div class="fw-bold text-truncate" style="font-size: 1.05rem;">${t.Description}</div>
              <div class="text-muted small text-truncate">${t.Category}${t.Subcategory ? ' / ' + t.Subcategory : ''}</div>
              ${t.Notes ? `<div class="text-muted small text-truncate">${t.Notes}</div>` : ''}
            </div>
            <div class="text-end ms-2" style="flex-shrink: 0;">
              <div class="${amountClass} text-nowrap" style="font-size: 1.1rem;">${amountStr}</div>
              <div class="text-muted small mt-1 text-nowrap">${formatDate(t.DateTime)}</div>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    } catch (error) {
      console.error("Failed to render transaction:", t, error);
    }
  });

  // Mobile row click
  tbody.querySelectorAll('.mobile-row-click').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // Ignore if clicking a button inside (like desktop edit/del)

      const id = row.getAttribute('data-id');
      if (state.isSelectionMode) {
        toggleIdSelection(id);
      } else {
        editTransaction(id);
      }
    });
  });

  // Checkbox click
  tbody.querySelectorAll('.transaction-checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleIdSelection(cb.getAttribute('data-id'));
    });
  });

  // Attach inline edit/delete listeners dynamically safely
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTransaction(btn.getAttribute('data-id'));
    });
  });
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(btn.getAttribute('data-id'));
    });
  });

  // Cascade update to Analytics when data changes
  renderAnalytics();
}

function toggleSelectionMode(enabled) {
  state.isSelectionMode = enabled;
  state.selectedIds = [];

  const bulkMenu = document.getElementById('bulkActionsMenu');
  const btnSelect = document.getElementById('btnSelectMode');
  const btnAdd = document.getElementById('btnAddExpense');
  const selectionCols = document.querySelectorAll('.selection-column');
  const selectAllCheck = document.getElementById('selectAllCheckbox');

  if (bulkMenu) bulkMenu.classList.toggle('d-none', !enabled);
  if (btnSelect) btnSelect.classList.toggle('d-none', enabled);
  if (btnAdd) btnAdd.classList.toggle('d-none', enabled);

  selectionCols.forEach(col => col.classList.toggle('d-none', !enabled));
  if (selectAllCheck) selectAllCheck.checked = false;

  if (!enabled) {
    const bulkCatSelect = document.getElementById('bulkCategorySelect');
    if (bulkCatSelect) bulkCatSelect.selectedIndex = 0;
    const bulkSubSelect = document.getElementById('bulkSubcategorySelect');
    if (bulkSubSelect) bulkSubSelect.selectedIndex = 0;
  }

  updateSelectedCount();
  renderTransactions();
}

function updateSelectedCount() {
  const countEl = document.getElementById('selectedCount');
  if (countEl) {
    countEl.textContent = state.selectedIds.length;
  }

  const bulkApplyBtn = document.getElementById('btnBulkApplyCategory');
  const bulkSubApplyBtn = document.getElementById('btnBulkApplySubcategory');
  const bulkTagsBtn = document.getElementById('btnBulkApplyTags');
  const bulkDeleteBtn = document.getElementById('btnBulkDelete');
  const hasSelection = state.selectedIds.length > 0;

  if (bulkApplyBtn) bulkApplyBtn.disabled = !hasSelection;
  if (bulkSubApplyBtn) bulkSubApplyBtn.disabled = !hasSelection;
  if (bulkTagsBtn) bulkTagsBtn.disabled = !hasSelection;
  if (bulkDeleteBtn) bulkDeleteBtn.disabled = !hasSelection;
}

function handleBulkDelete() {
  if (state.selectedIds.length === 0) return;

  if (confirm(`Are you sure you want to delete ${state.selectedIds.length} transactions?`)) {
    const idsToDelete = new Set(state.selectedIds);
    state.transactions = state.transactions.filter(t => !idsToDelete.has(t.id));

    markUnsavedChanges();
    toggleSelectionMode(false);
    showStatusMessage(`Deleted ${idsToDelete.size} transactions`, 'danger');
  }
}

function handleBulkApplyCategory() {
  const category = document.getElementById('bulkCategorySelect').value;
  if (!category || state.selectedIds.length === 0) return;

  if (confirm(`Apply category "${category}" to ${state.selectedIds.length} transactions?`)) {
    const idsToUpdate = new Set(state.selectedIds);
    state.transactions.forEach(t => {
      if (idsToUpdate.has(t.id)) {
        t.Category = category;
      }
    });

    markUnsavedChanges();
    toggleSelectionMode(false);
    showStatusMessage(`Updated category for ${idsToUpdate.size} transactions`);
  }
}

function handleBulkApplySubcategory() {
  const selectVal = document.getElementById('bulkSubcategorySelect').value;
  if (!selectVal || state.selectedIds.length === 0) return;

  const [category, subcategory] = selectVal.split('|');
  if (!category || !subcategory) return;

  if (confirm(`Apply subcategory "${subcategory}" and category "${category}" to ${state.selectedIds.length} transactions?`)) {
    const idsToUpdate = new Set(state.selectedIds);
    state.transactions.forEach(t => {
      if (idsToUpdate.has(t.id)) {
        t.Category = category;
        t.Subcategory = subcategory;
      }
    });

    markUnsavedChanges();
    toggleSelectionMode(false);
    showStatusMessage(`Updated subcategory for ${idsToUpdate.size} transactions`);
  }
}

function handleBulkApplyTags() {
  const tagsInput = document.getElementById('bulkTagsInput').value;
  if (!tagsInput || state.selectedIds.length === 0) return;

  const normalizedNewTags = normalizeTags(tagsInput);
  if (!normalizedNewTags) return;

  const newTagsList = normalizedNewTags.split(/\s+/);

  if (confirm(`Add ${newTagsList.length} tag(s) to ${state.selectedIds.length} transactions?`)) {
    const idsToUpdate = new Set(state.selectedIds);
    state.transactions.forEach(t => {
      if (idsToUpdate.has(t.id)) {
        const combinedString = (t.Tags || '') + ' ' + normalizedNewTags;
        t.Tags = normalizeTags(combinedString);
      }
    });

    document.getElementById('bulkTagsInput').value = '';
    updateAllTags();
    markUnsavedChanges();
    toggleSelectionMode(false);
    showStatusMessage(`Updated tags for ${idsToUpdate.size} transactions`);
  }
}

/**
 * Pre-fills the modal form to modify an existing transaction.
 */
function editTransaction(id) {
  const t = state.transactions.find(tx => tx.id === id);
  if (!t) return;

  document.getElementById('editTransactionId').value = t.id;

  const healthIssues = document.getElementById('transactionHealthIssues');
  const issues = getTransactionIssues(t, state.categories);
  healthIssues.textContent = issues.map(issue => issue.message).join(' · ');
  healthIssues.classList.toggle('d-none', !issues.length);
  document.getElementById('inputDate').value = '';
  document.getElementById('inputTime').value = '';

  if (t.DateTime) {
    const [d, tPart] = t.DateTime.split('T');
    document.getElementById('inputDate').value = d;
    if (tPart) {
      document.getElementById('inputTime').value = tPart.match(/^\d{2}:\d{2}(?::\d{2})?/)?.[0] || '';
    }
  }

  document.getElementById('inputAmount').value = t.Amount;
  document.getElementById('inputDescription').value = t.Description;

  const catSelect = document.getElementById('inputCategory');
  // Rebuild to discard temporary options from a previously edited transaction.
  populateCategoriesDropdown();
  if (t.Category && !Array.from(catSelect.options).some(option => option.value === t.Category)) {
    const option = document.createElement('option');
    option.value = t.Category;
    option.textContent = t.Category;
    catSelect.appendChild(option);
  }
  catSelect.value = t.Category;
  populateSubcategoriesDropdown(t);
  document.getElementById('inputSubcategory').value = t.Subcategory
    ? JSON.stringify([t.Category, t.Subcategory]) : '';
  document.getElementById('inputTags').value = t.Tags;
  document.getElementById('inputNotes').value = t.Notes;

  if (state.viewOnlyMode) {
    document.getElementById('expenseModalLabel').textContent = 'Transaction Details';
    
    // Disable inputs
    const inputs = ['inputDate', 'inputTime', 'inputAmount', 'inputDescription', 'inputCategory', 'inputSubcategory', 'inputTags', 'inputNotes', 'inlineInput'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });

    const btnDelete = document.getElementById('btnDeleteTransactionModal');
    if (btnDelete) btnDelete.classList.add('d-none');

    const btnSave = document.getElementById('btnSaveTransaction');
    if (btnSave) btnSave.classList.add('d-none');
  } else {
    document.getElementById('expenseModalLabel').textContent = 'Edit Transaction';
    
    // Enable inputs
    const inputs = ['inputDate', 'inputTime', 'inputAmount', 'inputDescription', 'inputCategory', 'inputSubcategory', 'inputTags', 'inputNotes', 'inlineInput'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    const btnDelete = document.getElementById('btnDeleteTransactionModal');
    if (btnDelete) btnDelete.classList.remove('d-none');

    const btnSave = document.getElementById('btnSaveTransaction');
    if (btnSave) btnSave.classList.remove('d-none');
  }

  if (expenseModalInstance) expenseModalInstance.show();
}

function toggleIdSelection(id) {
  const index = state.selectedIds.indexOf(id);
  if (index === -1) {
    state.selectedIds.push(id);
  } else {
    state.selectedIds.splice(index, 1);
  }

  // Sync the Select All checkbox
  const selectAllCheck = document.getElementById('selectAllCheckbox');
  if (selectAllCheck) {
    selectAllCheck.checked = state.selectedIds.length === state.transactions.length && state.transactions.length > 0;
  }

  renderTransactions();
  updateSelectedCount();
}

/**
 * Removes a transaction by ID.
 */
function deleteTransaction(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    markUnsavedChanges();
    renderTransactions();
  }
}

/**
 * Handles saving standard or edited form inputs back to the state.
 */
function parseInlineInput(text) {
  const result = Papa.parse(text, { delimiter: ',', skipEmptyLines: 'greedy' });
  const rows = [];
  const errors = result.errors.map(error => `Line ${(error.row || 0) + 1}: ${error.message}`);
  const warnings = [];
  result.data.forEach((fields, index) => {
    const row = parseInlineRow(fields, state.categories, index + 1);
    if (row.error) errors.push(row.error);
    else rows.push(row);
    warnings.push(...row.warnings);
  });
  return { rows, errors, warnings };
}

function showInlineFeedback(messages) {
  const feedback = document.getElementById('inlineInputFeedback');
  feedback.textContent = messages.join('\n');
  feedback.classList.toggle('d-none', messages.length === 0);
}

function handleTransactionSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('editTransactionId').value;
  const inlineInput = document.getElementById('inlineInput');
  const inlineVal = inlineInput ? inlineInput.value.trim() : '';
  const parsed = inlineVal ? parseInlineInput(inlineVal) : null;
  if (parsed && (parsed.errors.length || !parsed.rows.length)) {
    showInlineFeedback(parsed.errors.length ? parsed.errors : ['Enter at least one transaction.']);
    return;
  }
  if (id && parsed && parsed.rows.length > 1) {
    showInlineFeedback(['Only one inline transaction is allowed when editing.']);
    return;
  }

  const Category = document.getElementById('inputCategory').value ||
    (parsed?.rows[0]?.hasCategory ? '' : 'Uncategorized');
  const subcategoryOption = document.getElementById('inputSubcategory').selectedOptions[0];
  const Subcategory = subcategoryOption?.dataset.subcategory || '';
  const Tags = normalizeTags(document.getElementById('inputTags').value);
  const Notes = document.getElementById('inputNotes').value;

  if (!id && parsed && parsed.rows.length > 1) {
    // Multi-line add
    parsed.rows.forEach(row => {
      const transaction = row.transaction;
      state.transactions.push({
        id: crypto.randomUUID(),
        DateTime: parseInlineDate(transaction.DateTime),
        Amount: transaction.Amount,
        Description: transaction.Description,
        Category: row.hasCategory ? transaction.Category : Category,
        Subcategory: row.hasCategory ? transaction.Subcategory : Subcategory,
        Tags: Tags,
        Notes: Notes
      });
    });
  } else {
    // Standard Single Add/Edit
    const DateVal = document.getElementById('inputDate').value;
    const TimeVal = document.getElementById('inputTime').value || '00:00:00';

    const tempDate = new Date(`${DateVal}T${TimeVal}`);
    let isoDateTime = `${DateVal}T${TimeVal.length === 5 ? TimeVal + ':00' : TimeVal}${getTimezoneOffset(tempDate)}`;
    const inlineDateTime = parsed ? parseInlineDate(parsed.rows[0].transaction.DateTime) : '';
    if (inlineDateTime && DateVal === inlineDateTime.slice(0, 10) &&
        TimeVal === inlineDateTime.slice(11, 19)) {
      isoDateTime = inlineDateTime;
    }

    // Classification-only repairs must preserve the original timezone and precision.
    const original = id ? state.transactions.find(t => t.id === id) : null;
    if (!parsed && original && isValidTransactionDate(original.DateTime) &&
        DateVal === original.DateTime.slice(0, 10) && TimeVal === original.DateTime.slice(11, 19)) {
      isoDateTime = original.DateTime;
    }

    const amountInput = document.getElementById('inputAmount').value;
    const Description = document.getElementById('inputDescription').value.trim();
    const validated = parseInlineRow([isoDateTime, amountInput, Description], state.categories, 1);
    if (validated.error) {
      showInlineFeedback([validated.error]);
      return;
    }
    const Amount = validated.transaction.Amount;

    if (id) {
      // Perform Edit
      const index = state.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        state.transactions[index] = { id, DateTime: isoDateTime, Amount, Description, Category, Subcategory, Tags: Tags, Notes };
      }
    } else {
      // Perform Add
      state.transactions.push({
        id: crypto.randomUUID(),
        DateTime: isoDateTime,
        Amount,
        Description,
        Category,
        Subcategory,
        Tags: Tags,
        Notes
      });
    }
  }

  updateAllTags();
  markUnsavedChanges();
  if (expenseModalInstance) expenseModalInstance.hide();

  renderTransactions();
  const notice = document.getElementById('inlineImportNotice');
  notice.textContent = parsed?.warnings.length
    ? `Transactions added to the current session. ${parsed.warnings.join(' ')}` : '';
  notice.classList.toggle('d-none', !parsed?.warnings.length);
}

/**
 * Updates the global list of unique tags from all transactions.
 */
function updateAllTags() {
  const tagsSet = new Set();
  state.transactions.forEach(t => {
    if (t.Tags) {
      t.Tags.split(/\s+/).forEach(tag => {
        if (tag.trim()) tagsSet.add(tag.trim());
      });
    }
  });
  state.allTags = Array.from(tagsSet).sort();
}

/**
 * Shows suggestions for the current word being typed in the tags input.
 */
function showTagSuggestions(inputId, boxId) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(inputId);
  const inputVal = input.value;

  // Find the tag currently being typed (at cursor position)
  const cursorPos = input.selectionStart;
  const textBefore = inputVal.substring(0, cursorPos);
  const parts = textBefore.split(/[\s,]+/);
  const currentPart = parts[parts.length - 1].trim().toLowerCase();

  if (!currentPart || currentPart === '#') {
    box.classList.add('d-none');
    return;
  }

  // Get the search query without the leading '#' for matching
  const matchQuery = currentPart.startsWith('#') ? currentPart.substring(1) : currentPart;

  const matches = state.allTags.filter(tag => {
    const rawTag = tag.startsWith('#') ? tag.substring(1) : tag;
    return rawTag.toLowerCase().startsWith(matchQuery) &&
      !inputVal.toLowerCase().includes(tag.toLowerCase());
  }).slice(0, 5); // Limit to 5 suggestions

  if (matches.length === 0) {
    box.classList.add('d-none');
    return;
  }

  box.innerHTML = '';
  matches.forEach(match => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action py-2 small';
    item.textContent = match;
    item.addEventListener('click', () => applyTagSuggestion(match, inputId, boxId));
    box.appendChild(item);
  });

  box.classList.remove('d-none');
}

/**
 * Replaces the current word in the tags input with the selected suggestion.
 */
function applyTagSuggestion(suggestion, inputId, boxId) {
  const input = document.getElementById(inputId);
  const val = input.value;
  const cursorPos = input.selectionStart;

  // Find the start and end indices of the word currently being typed at the cursor position
  let start = cursorPos;
  while (start > 0 && !/[\s,]/.test(val[start - 1])) {
    start--;
  }

  let end = cursorPos;
  while (end < val.length && !/[\s,]/.test(val[end])) {
    end++;
  }

  // Replace the word between start and end with the selected suggestion (with '#' prefix)
  const cleanSuggestion = suggestion.startsWith('#') ? suggestion : '#' + suggestion;
  const newVal = val.substring(0, start) + cleanSuggestion + ' ' + val.substring(end);

  // Normalize newVal
  const finalVal = normalizeTags(newVal);

  input.value = finalVal + (finalVal ? ' ' : '');
  input.focus();

  // Position cursor at the end
  input.selectionStart = input.selectionEnd = input.value.length;

  document.getElementById(boxId).classList.add('d-none');
}

/**
 * Shows a temporary status message in the navbar.
 */
export function showStatusMessage(message, type = 'success') {
  const statusEl = document.getElementById('currentFileName');
  const originalText = state.fileName;
  const originalClass = statusEl.className;

  statusEl.textContent = message;
  statusEl.className = `fw-bold text-${type}`;

  setTimeout(() => {
    statusEl.textContent = originalText;
    statusEl.className = originalClass;
  }, 3000);
}
