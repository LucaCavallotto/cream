// Catalog entries never rewrite imported classifications. Only used entries travel in CSV.
export const classificationKey = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export const isUnclassified = (value) => !classificationKey(value) || classificationKey(value) === 'uncategorized';
export function buildCatalog(suggested = {}, transactions = [], additions = {}) {
  const catalog = Object.fromEntries(Object.entries(suggested).map(([key, values]) => [key, [...values]]));
  const add = (category, subcategory) => {
    if (isUnclassified(category)) return;
    if (!Object.hasOwn(catalog, category)) Object.defineProperty(catalog, category, { value: [], enumerable: true, writable: true });
    if (subcategory && !isUnclassified(subcategory) && !catalog[category].includes(subcategory)) catalog[category].push(subcategory);
  };
  Object.entries(additions).forEach(([category, subs]) => { add(category); subs.forEach(sub => add(category, sub)); });
  transactions.forEach(t => add(t.Category, t.Subcategory));
  return catalog;
}
export function existingClassification(value, choices) {
  return choices.find(choice => classificationKey(choice) === classificationKey(value));
}
function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] !== b[j - 1]));
    row = next;
  }
  return row[b.length];
}
export function similarClassification(value, choices) {
  const key = classificationKey(value);
  return choices.find(choice => choice !== value && (classificationKey(choice) === key || (key.length >= 5 && classificationKey(choice).length >= 5 && distance(key, classificationKey(choice)) === 1)));
}
export function customClassifications(transactions, suggested) {
  const entries = new Map();
  const catalog = buildCatalog(suggested, transactions);
  transactions.forEach(t => {
    if (isUnclassified(t.Category)) return;
    const customCategory = !Object.hasOwn(suggested, t.Category);
    const customSubcategory = t.Subcategory && !isUnclassified(t.Subcategory) && !(Object.hasOwn(suggested, t.Category) && suggested[t.Category].includes(t.Subcategory));
    if (!customCategory && !customSubcategory) return;
    const key = JSON.stringify([t.Category, t.Subcategory || '']);
    if (!entries.has(key)) entries.set(key, { category: t.Category, subcategory: t.Subcategory || '', count: 0,
      suggestion: (customCategory && similarClassification(t.Category, Object.keys(catalog))) || (customSubcategory && similarClassification(t.Subcategory, catalog[t.Category])) || '' });
    entries.get(key).count++;
  });
  return [...entries.values()];
}
