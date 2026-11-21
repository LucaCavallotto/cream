import { spacedMoney } from '../../assets/js/money.js';
import { existingClassification, isUnclassified } from '../../assets/js/classificationCatalog.js';
import { createTransactionId } from '../../assets/js/transactionId.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { parseInlineCSV, parseInlineRow } from '../../assets/js/inlineInput.js';
import {
  getTransactionIssues,
  isValidTransactionDate,
} from '../../assets/js/datasetHealth.js';
import { normalizeTags } from '../../assets/js/transactions.js';
import { formatDate, inlineDateTime, timezoneOffset } from '../../assets/js/dateTime.js';
import TagInput from './TagInput.jsx';

const timePart = (value) =>
  value?.split('T')[1]?.match(/^\d{2}:\d{2}(?::\d{2})?/)?.[0] || '';
const seconds = (value) => (value.length === 5 ? value + ':00' : value);

export default function ExpenseModal({
  transaction,
  transactionIssues,
  categories,
  onAddClassification,
  tags,
  viewOnly,
  onClose,
  onCommit,
  onDelete,
  returnFocus,
}) {
  const modal = useRef(null);
  const [draft, setDraft] = useState(() => ({
    date: transaction?.DateTime?.split('T')[0] || '',
    time: timePart(transaction?.DateTime),
    amount: Number.isFinite(transaction?.Amount)
      ? String(transaction.Amount)
      : '',
    description: transaction?.Description || '',
    category: transaction?.Category || '',
    subcategory: transaction?.Subcategory || '',
    tags: transaction?.Tags || '',
    notes: transaction?.Notes || '',
  }));
  const [inline, setInline] = useState(''),
    [errors, setErrors] = useState([]);
  const [adding, setAdding] = useState(''), [newName, setNewName] = useState(''), [nameError, setNameError] = useState('');
  const parsed = useMemo(
    () =>
      inline.trim() ? parseInlineCSV(inline.trim(), categories, Papa) : null,
    [inline, categories],
  );
  const issues = transaction
    ? transactionIssues || getTransactionIssues(transaction, categories)
    : [];
  const groups = new Map(
    Object.entries(categories).map(([category, subs]) => [category, [...subs]]),
  );
  if (transaction?.Category && !groups.has(transaction.Category))
    groups.set(transaction.Category, []);
  if (transaction?.Subcategory) {
    const subs = groups.get(transaction.Category || '') || [];
    if (!subs.includes(transaction.Subcategory))
      subs.push(transaction.Subcategory);
    groups.set(transaction.Category || '', subs);
  }
  const update = (key, value) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  useEffect(() => {
    const previous = returnFocus || document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    modal.current.focus();
    function keyboard(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const controls = [
          ...modal.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
          ),
        ].filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === modal.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', keyboard);
      previous?.focus?.();
    };
  }, [onClose, returnFocus]);

  function changeInline(value) {
    setInline(value);
    setErrors([]);
    if (!value.trim()) return;
    const first = parseInlineCSV(value.trim(), categories, Papa).rows[0];
    if (!first) return;
    const t = first.transaction,
      dateTime = inlineDateTime(t.DateTime);
    setDraft((previous) => ({
      ...previous,
      date: dateTime.split('T')[0],
      time: timePart(dateTime),
      amount: String(t.Amount),
      description: t.Description,
      ...(first.hasCategory
        ? { category: t.Category, subcategory: t.Subcategory }
        : {}),
    }));
  }

  function addClassification() {
    const name = newName.trim().replace(/\s+/g, ' ');
    if (!name || isUnclassified(name)) { setNameError('Enter a name other than Uncategorized.'); return; }
    if (adding === 'subcategory' && isUnclassified(draft.category)) { setNameError('Choose a category first.'); return; }
    const existing = existingClassification(name, adding === 'category' ? Object.keys(categories) : categories[draft.category] || []);
    if (existing) { setNameError(`“${existing}” already exists. Select the existing entry.`); return; }
    const category = adding === 'category' ? name : draft.category;
    const subcategory = adding === 'subcategory' ? name : '';
    onAddClassification(category, subcategory);
    setDraft(d => ({ ...d, category, subcategory }));
    setAdding(''); setNewName(''); setNameError('');
  }

  function submit(event) {
    event.preventDefault();
    if (viewOnly) return;
    if (parsed?.errors.length || (parsed && !parsed.rows.length)) {
      setErrors(
        parsed.errors.length
          ? parsed.errors
          : ['Enter at least one transaction.'],
      );
      return;
    }
    if (transaction && parsed?.rows.length > 1) {
      setErrors(['Only one inline transaction is allowed when editing.']);
      return;
    }
    const shared = {
      Category:
        draft.category || (parsed?.rows[0]?.hasCategory ? '' : 'Uncategorized'),
      Subcategory: draft.subcategory,
      Tags: normalizeTags(draft.tags),
      Notes: draft.notes,
    };
    let rows;
    if (!transaction && parsed?.rows.length > 1) {
      rows = parsed.rows.map((row) => ({
        ...shared,
        ...row.transaction,
        DateTime: inlineDateTime(row.transaction.DateTime),
        Category: row.hasCategory ? row.transaction.Category : shared.Category,
        Subcategory: row.hasCategory
          ? row.transaction.Subcategory
          : shared.Subcategory,
      }));
    } else {
      const time = seconds(draft.time || '00:00:00');
      let DateTime = `${draft.date}T${time}${timezoneOffset(new Date(`${draft.date}T${time}`))}`;
      const original = parsed
        ? inlineDateTime(parsed.rows[0].transaction.DateTime)
        : transaction?.DateTime;
      if (
        original &&
        isValidTransactionDate(original) &&
        draft.date === original.split('T')[0] &&
        time === seconds(timePart(original) || '00:00:00')
      )
        DateTime = original;
      const validated = parseInlineRow(
        [DateTime, draft.amount, draft.description.trim()],
        categories,
        1,
      );
      if (validated.error) {
        setErrors([validated.error]);
        return;
      }
      rows = [
        {
          ...shared,
          ...validated.transaction,
          Category: shared.Category,
          Subcategory: shared.Subcategory,
        },
      ];
    }
    onCommit(
      rows.map((t) => ({ ...t, id: transaction?.id || createTransactionId() })),
      transaction?.id,
      parsed?.warnings || [],
    );
  }
  const messages = [
    ...new Set([
      ...errors,
      ...(parsed?.errors || []),
      ...(parsed?.warnings || []),
    ]),
  ];
  const required = !(parsed?.rows.length > 1);
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        ref={modal}
        className="modal fade show"
        id="expenseModal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expenseModalLabel"
        style={{ display: 'block' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="expenseModalLabel">
                {viewOnly
                  ? 'Transaction Details'
                  : transaction
                    ? 'Edit Transaction'
                    : 'Add Transaction'}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div
                id="transactionHealthIssues"
                className={`alert alert-warning ${issues.length ? '' : 'd-none'}`}
                role="status"
              >
                {issues.map((issue) => issue.message).join(' · ')}
              </div>
              <form id="expenseForm" onSubmit={submit}>
                <input
                  id="editTransactionId"
                  type="hidden"
                  value={transaction?.id || ''}
                  readOnly
                />
                {!viewOnly && <div className="mb-4 p-3 bg-body-tertiary rounded border border-primary-subtle">
                  <label
                    htmlFor="inlineInput"
                    className="form-label fw-bold text-primary"
                  >
                    Quick Inline Entry
                  </label>
                  <textarea
                    id="inlineInput"
                    className="form-control form-control-lg"
                    rows={2}
                    disabled={viewOnly}
                    value={inline}
                    onChange={(e) => changeInline(e.target.value)}
                    placeholder={
                      '2026-11-02T14:28:36+01:00, €-1, Coffee, Bar, Coffee\n2026-11-02, €-20, Groceries'
                    }
                  />
                  <div className="form-text">
                    Format: Date or ISO timestamp, Amount (+/-), Description[,
                    Category[, Subcategory]]. Category and subcategory are
                    optional. Multiple lines supported. Put descriptions
                    containing commas in double quotes. Unknown classifications
                    are omitted with a warning.
                  </div>
                  <div
                    id="inlineInputFeedback"
                    className={`alert alert-warning mt-2 mb-0 ${messages.length ? '' : 'd-none'}`}
                    role="alert"
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {messages.join('\n')}
                  </div>
                </div>
                }
                <hr className="mb-4" />
                {!viewOnly && (
                  <div className="date-shortcuts">
                    <span>Date &amp; time</span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        const now = new Date();
                        const pad = (value) => String(value).padStart(2, '0');
                        setDraft((previous) => ({
                          ...previous,
                          date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
                          time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
                        }));
                      }}
                    >
                      <i className="bi bi-clock" aria-hidden="true" /> Now
                    </button>
                  </div>
                )}
                {viewOnly && <p className="transaction-display-date"><strong>Date &amp; time</strong><br />{formatDate(transaction?.DateTime)}</p>}
                <div className="row g-3 mb-3">
                  <div className={viewOnly ? 'd-none' : 'col-md-4'}>
                    <label htmlFor="inputDate" className="form-label">
                      Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="inputDate"
                      className="form-control"
                      required={required}
                      disabled={viewOnly}
                      value={draft.date}
                      onChange={(e) => update('date', e.target.value)}
                    />
                  </div>
                  <div className={viewOnly ? 'd-none' : 'col-md-4'}>
                    <label htmlFor="inputTime" className="form-label">
                      Time <span className="text-muted">(Optional)</span>
                    </label>
                    <input
                      type="time"
                      step="1"
                      id="inputTime"
                      className="form-control"
                      disabled={viewOnly}
                      value={draft.time}
                      onChange={(e) => update('time', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="inputAmount" className="form-label">
                      Amount <span className="text-danger">*</span>
                    </label>
                    <input
                      type={viewOnly ? 'text' : 'number'}
                      step="0.01"
                      id="inputAmount"
                      className="form-control"
                      placeholder="e.g. 50.00 or -50"
                      required={required}
                      disabled={viewOnly}
                      value={viewOnly && Number.isFinite(transaction?.Amount) ? spacedMoney(transaction.Amount) : draft.amount}
                      onChange={(e) => update('amount', e.target.value)}
                    />
                    <div className="form-text">
                      Positive for Income, negative for Expense.
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="inputDescription" className="form-label">
                    Description <span className="text-danger">*</span>
                  </label>
                  <input
                    id="inputDescription"
                    className="form-control"
                    placeholder="e.g. Weekly Groceries"
                    required={required}
                    disabled={viewOnly}
                    value={draft.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label htmlFor="inputCategory" className="form-label">
                      Category
                    </label>
                    <select
                      id="inputCategory"
                      className="form-select"
                      disabled={viewOnly}
                      value={draft.category}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          category: e.target.value,
                          subcategory:
                            e.target.value === d.category ? d.subcategory : '',
                        }))
                      }
                    >
                      <option value="">
                        Select Category
                      </option>
                      {[...groups.keys()].filter(Boolean).map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputSubcategory" className="form-label">
                      Subcategory
                    </label>
                    <select
                      id="inputSubcategory"
                      className="form-select"
                      disabled={viewOnly}
                      value={
                        draft.subcategory
                          ? JSON.stringify([draft.category, draft.subcategory])
                          : ''
                      }
                      onChange={(e) => {
                        if (!e.target.value) { update('subcategory', ''); return; }
                        const [category, subcategory] = JSON.parse(
                          e.target.value,
                        );
                        setDraft((d) => ({ ...d, category, subcategory }));
                      }}
                    >
                      <option value="">
                        Select Subcategory
                      </option>
                      {[...groups]
                        .filter(([category, subs]) => subs.length && (isUnclassified(draft.category) || category === draft.category))
                        .map(([category, subs]) => (
                          <optgroup
                            key={category}
                            label={category || '(No Category)'}
                          >
                            {subs.map((sub) => (
                              <option
                                key={sub}
                                value={JSON.stringify([category, sub])}
                              >
                                {sub}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                  </div>
                </div>
                {!viewOnly && <div className="mb-3 classification-create">
                  <div className="d-flex flex-wrap gap-2">
                    {['category', 'subcategory'].map(kind => <button key={kind} type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setAdding(kind); setNewName(''); setNameError(''); }}>Add {kind}</button>)}
                  </div>
                  {adding && <div className="mt-2">
                    <label htmlFor="newClassification" className="form-label">New {adding}</label>
                    <div className="d-flex gap-2">
                      <input id="newClassification" className="form-control" value={newName} onChange={e => setNewName(e.target.value)} />
                      <button type="button" className="btn btn-primary" onClick={addClassification}>Add</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setAdding('')}>Cancel</button>
                    </div>
                    <p className="form-text">Custom entries are kept in your CSV when used in a saved transaction.</p>
                    {nameError && <p role="alert" className="text-danger">{nameError}</p>}
                  </div>}
                </div>}
                <div className="mb-3 position-relative">
                  <label htmlFor="inputTags" className="form-label">
                    Tags
                  </label>
                  <TagInput
                    id="inputTags"
                    value={draft.tags}
                    onChange={(value) => update('tags', value)}
                    tags={tags}
                    disabled={viewOnly}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="inputNotes" className="form-label">
                    Notes
                  </label>
                  <textarea
                    id="inputNotes"
                    rows={2}
                    className="form-control"
                    placeholder="Additional details..."
                    disabled={viewOnly}
                    value={draft.notes}
                    onChange={(e) => update('notes', e.target.value)}
                  />
                </div>
                <div className="d-flex justify-content-between mt-4">
                  {transaction && !viewOnly && (
                    <button
                      type="button"
                      id="btnDeleteTransactionModal"
                      className="btn btn-danger"
                      onClick={() => onDelete(transaction.id)}
                    >
                      Delete
                    </button>
                  )}
                  <div className="text-end flex-grow-1">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    {!viewOnly && (
                      <button
                        type="submit"
                        id="btnSaveTransaction"
                        className="btn btn-primary"
                      >
                        Save Transaction
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
