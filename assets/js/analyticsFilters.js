import { createAnalyticsExclusions, isExcludedFromAnalytics, getAnalyticsExclusionOptions, excludeAnalyticsCategory, excludeAllAnalyticsCategories } from './analyticsScope.js';

let visibleLimit = 50;
let previousExclusions = null;

export function renderAnalyticsFilters(state, selection, selectedExcluded, onChange) {
  const exclusions = state.analyticsExclusions;
  const search = document.getElementById('analyticsExclusionSearch');
  if (previousExclusions !== exclusions) {
    previousExclusions = exclusions;
    search.value = '';
    visibleLimit = 50;
  }
  const active = exclusions.categories.size + exclusions.subcategories.size + exclusions.transactions.size;
  const summary = document.getElementById('analyticsExclusionSummary');
  const counted = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
  summary.textContent = `Excluded: ${counted(exclusions.categories.size, 'category', 'categories')}, ` +
    `${counted(exclusions.subcategories.size, 'subcategory', 'subcategories')}, ${counted(exclusions.transactions.size, 'individual selection')}. ` +
    `${counted(selection.excluded.length, 'transaction')} total; ${selectedExcluded.length} in the selected period.` +
    (selection.invalidCount ? ` ${counted(selection.invalidCount, 'invalid record')} also outside analytics.` : '');
  summary.classList.toggle('alert-warning', active > 0);
  summary.classList.toggle('alert-info', active === 0);

  const clear = document.getElementById('analyticsIncludeAll');
  clear.disabled = active === 0;
  clear.onclick = () => { state.analyticsExclusions = createAnalyticsExclusions(); onChange(); };

  const excludeAll = document.getElementById('analyticsExcludeAll');
  excludeAll.disabled = !state.transactions.length || state.transactions.every(t => exclusions.categories.has(t.Category || ''));
  excludeAll.onclick = () => { state.analyticsExclusions = excludeAllAnalyticsCategories(state.transactions); onChange(); };

  const groups = getAnalyticsExclusionOptions(state.transactions, exclusions);
  const categorySelect = document.getElementById('analyticsExcludeCategory');
  const previousCategory = categorySelect.value;
  categorySelect.replaceChildren(new Option(groups.size ? 'Choose category…' : 'All categories excluded', ''));
  categorySelect.disabled = !groups.size;
  [...groups.keys()].sort().forEach(category => categorySelect.add(new Option(category || '(No category)', JSON.stringify(category))));
  if ([...categorySelect.options].some(option => option.value === previousCategory)) categorySelect.value = previousCategory;
  const subcategorySelect = document.getElementById('analyticsExcludeSubcategory');
  const addRule = document.getElementById('analyticsAddExclusion');
  const populateSubcategories = (previousSubcategory = '') => {
    subcategorySelect.replaceChildren(new Option('Entire category', ''));
    const selectedCategory = categorySelect.value ? JSON.parse(categorySelect.value) : null;
    if (selectedCategory !== null) {
      [...groups.get(selectedCategory)].sort().forEach(sub => subcategorySelect.add(new Option(sub || '(No subcategory)', JSON.stringify(sub))));
    }
    if ([...subcategorySelect.options].some(option => option.value === previousSubcategory)) subcategorySelect.value = previousSubcategory;
    subcategorySelect.disabled = selectedCategory === null;
    addRule.disabled = selectedCategory === null;
  };
  populateSubcategories(subcategorySelect.value);
  categorySelect.onchange = () => populateSubcategories();
  addRule.onclick = () => {
    if (!categorySelect.value) return;
    const category = JSON.parse(categorySelect.value);
    if (subcategorySelect.value) exclusions.subcategories.add(JSON.stringify([category, JSON.parse(subcategorySelect.value)]));
    else excludeAnalyticsCategory(exclusions, category);
    onChange();
  };

  const ruleList = document.getElementById('analyticsExclusionRules');
  ruleList.replaceChildren();
  const appendRule = (label, collection, key) => {
    const row = document.createElement('div');
    row.className = 'd-flex justify-content-between align-items-center gap-2 border rounded p-2 mb-2';
    const text = document.createElement('span');
    text.className = 'text-break';
    text.textContent = label;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-outline-secondary flex-shrink-0';
    button.textContent = 'Remove rule';
    button.setAttribute('aria-label', `Remove exclusion: ${label}`);
    button.onclick = () => { collection.delete(key); onChange(); };
    row.append(text, button);
    ruleList.appendChild(row);
  };
  exclusions.categories.forEach(category => appendRule(category || '(No category)', exclusions.categories, category));
  exclusions.subcategories.forEach(key => {
    const [category, subcategory] = JSON.parse(key);
    appendRule(`${category || '(No category)'} / ${subcategory || '(No subcategory)'}`, exclusions.subcategories, key);
  });
  if (!ruleList.childElementCount) ruleList.textContent = 'No category or subcategory rules.';

  search.oninput = () => { visibleLimit = 50; onChange(); };
  const query = search.value.trim().toLowerCase();
  const matching = state.transactions.filter(t => [t.Description, t.Category, t.Subcategory, t.DateTime, t.Amount]
    .some(value => String(value ?? '').toLowerCase().includes(query)));
  const rows = document.getElementById('analyticsExclusionTransactions');
  rows.replaceChildren();
  matching.slice(0, visibleLimit).forEach(t => {
    const label = document.createElement('label');
    label.className = 'list-group-item d-flex gap-2 align-items-start';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input flex-shrink-0 mt-1';
    const byRule = exclusions.categories.has(t.Category || '') ||
      exclusions.subcategories.has(JSON.stringify([t.Category || '', t.Subcategory || '']));
    checkbox.checked = isExcludedFromAnalytics(t, exclusions);
    checkbox.disabled = byRule;
    checkbox.setAttribute('aria-label', `Exclude transaction: ${t.Description || '(Missing description)'} (${t.DateTime || 'No date'})`);
    checkbox.onchange = () => {
      if (checkbox.checked) exclusions.transactions.add(t.id);
      else exclusions.transactions.delete(t.id);
      onChange();
    };
    const text = document.createElement('span');
    text.className = 'small text-break';
    text.textContent = `${t.DateTime || '(No date)'} · ${t.Description || '(Missing description)'} · ` +
      `${Number.isFinite(t.Amount) ? `€${t.Amount.toFixed(2)}` : '(Invalid amount)'} · ${t.Category || '(No category)'}` +
      `${t.Subcategory ? ` / ${t.Subcategory}` : ''}${byRule ? ' · Excluded by category/subcategory rule' : ''}`;
    label.append(checkbox, text);
    rows.appendChild(label);
  });
  if (!matching.length) rows.textContent = 'No matching transactions.';
  document.getElementById('analyticsExclusionCount').textContent = `${exclusions.transactions.size} individual selections. Showing ${Math.min(matching.length, visibleLimit)} of ${matching.length} matching records.`;
  const more = document.getElementById('analyticsExclusionMore');
  more.classList.toggle('d-none', matching.length <= visibleLimit);
  more.onclick = () => { visibleLimit += 50; onChange(); };
}
