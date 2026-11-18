export function normalizeTags(tagsString) {
  if (!tagsString) return '';
  // Split by commas and/or any whitespace (covers both old and new formats)
  const parts = tagsString.split(/[\s,]+/);
  const cleanTags = [];
  parts.forEach(part => {
    // Remove all leading '#' characters to get the raw word
    let clean = part.replace(/^#+/, '').trim();
    if (clean) {
      // Ensure no spaces inside the tag name
      clean = clean.replace(/\s+/g, '');
      cleanTags.push('#' + clean);
    }
  });
  return [...new Set(cleanTags)].join(' ');
}

export function compareTransactions(a, b, sort) {
  const direction = sort.direction === 'asc' ? 1 : -1;
  if (sort.column === 'Amount' || sort.column === 'Date') {
    const left = sort.column === 'Date' ? Date.parse(a.DateTime) : a.Amount;
    const right = sort.column === 'Date' ? Date.parse(b.DateTime) : b.Amount;
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
    if (!Number.isFinite(right)) return -1;
    return (left - right) * direction;
  }
  return String(a[sort.column] || '').localeCompare(String(b[sort.column] || '')) * direction;
}
