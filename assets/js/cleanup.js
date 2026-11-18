import { analyzeDataset, HEALTH_CHECKS } from './datasetHealth.js';

let visibleLimit = 50;
let currentFile = null;

export function renderDatasetHealth(state, onEdit) {
  const filter = document.getElementById('cleanupFilter');
  if (currentFile !== state.fileName) {
    currentFile = state.fileName;
    visibleLimit = 50;
    filter.value = '';
  }
  const report = analyzeDataset(state.transactions, state.categories);
  const selectedFilter = filter.value;
  filter.replaceChildren(new Option('All issues', ''));
  Object.entries(HEALTH_CHECKS).forEach(([code, label]) => {
    if (report.counts[code] || code === selectedFilter) {
      filter.add(new Option(`${label} (${report.counts[code]})`, code));
    }
  });
  filter.value = selectedFilter;
  filter.onchange = () => {
    visibleLimit = 50;
    renderDatasetHealth(state, onEdit);
  };

  document.getElementById('cleanupTotal').textContent = report.total;
  document.getElementById('cleanupClean').textContent = report.clean;
  document.getElementById('cleanupDirty').textContent = report.dirty.length;
  document.getElementById('cleanupIssueCount').textContent = report.issueCount;
  document.getElementById('cleanupStatus').textContent = !report.total
    ? 'No transactions to check. Open a CSV or add transactions to get started.'
    : `${Math.round(report.clean / report.total * 100)}% of transactions have no detected issues.`;
  document.getElementById('cleanupReadOnly').classList.toggle('d-none', !state.viewOnlyMode);

  const filtered = report.dirty.filter(row => !selectedFilter || row.issues.some(issue => issue.code === selectedFilter));
  const list = document.getElementById('cleanupRecords');
  list.replaceChildren();
  filtered.slice(0, visibleLimit).forEach(({ transaction, recordNumber, issues }) => {
    const card = document.createElement('article');
    card.className = 'list-group-item p-3';
    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-start gap-3';
    const details = document.createElement('div');
    details.className = 'overflow-hidden';
    const title = document.createElement('h6');
    title.className = 'fw-bold text-break mb-1';
    title.textContent = `#${recordNumber} · ${transaction.Description?.trim() || '(Missing description)'}`;
    const metadata = document.createElement('p');
    metadata.className = 'small text-muted text-break mb-2';
    const amount = Number.isFinite(transaction.Amount) ? `€${transaction.Amount.toFixed(2)}` : String(transaction.Amount || '(Missing amount)');
    metadata.textContent = [transaction.DateTime || '(Missing date)', amount,
      transaction.Category || '(Missing category)', transaction.Subcategory || '(Missing subcategory)'].join(' · ');
    details.append(title, metadata);
    const problems = document.createElement('ul');
    problems.className = 'small mb-0 ps-3';
    issues.forEach(issue => {
      const item = document.createElement('li');
      item.textContent = issue.message;
      problems.appendChild(item);
    });
    details.appendChild(problems);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-primary btn-sm flex-shrink-0';
    button.textContent = state.viewOnlyMode ? 'View' : 'Review / Edit';
    button.setAttribute('aria-label', `${button.textContent} transaction ${recordNumber}`);
    button.onclick = () => onEdit(transaction.id);
    header.append(details, button);
    card.appendChild(header);
    list.appendChild(card);
  });
  const empty = document.getElementById('cleanupEmpty');
  empty.classList.toggle('d-none', filtered.length !== 0);
  empty.textContent = report.dirty.length
    ? 'No transactions match this issue filter.'
    : report.total ? 'All transactions pass the dataset checks.' : 'No transactions yet.';
  document.getElementById('cleanupVisibleCount').textContent = `Showing ${Math.min(filtered.length, visibleLimit)} of ${filtered.length} transactions to review`;
  const more = document.getElementById('cleanupShowMore');
  more.classList.toggle('d-none', visibleLimit >= filtered.length);
  more.onclick = () => {
    visibleLimit += 50;
    renderDatasetHealth(state, onEdit);
  };
}
