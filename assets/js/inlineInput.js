// Keep validation independent of the form so single and bulk entry use the same rules.
export function parseInlineRow(fields, categories, rowNumber) {
  const warnings = [];
  const fail = message => ({ error: `Line ${rowNumber}: ${message}`, warnings });
  if (fields.length < 3 || fields.length > 5) {
    return fail('Expected DateTime, Amount, Description, and optionally Category, Subcategory. Quote descriptions containing commas.');
  }
  const [date, amount, description, category, subcategory] = fields.map(field => field.trim());
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (!dateMatch) return fail('Invalid date. Use YYYY-MM-DD or an ISO timestamp.');
  const [, year, month, day, hour, minute, second] = dateMatch;
  const calendarDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (isNaN(calendarDate) || calendarDate.toISOString().slice(0, 10) !== `${year}-${month}-${day}` ||
      Number(hour || 0) > 23 || Number(minute || 0) > 59 || Number(second || 0) > 59 || isNaN(new Date(date))) {
    return fail('Invalid date or time.');
  }
  const amountText = amount.replace(/^€\s*/, '').replace(/\s*€$/, '');
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(amountText)) return fail('Invalid amount.');
  const Amount = Number(amountText.replace(',', '.'));
  if (!Number.isFinite(Amount)) return fail('Invalid amount.');
  if (!description) return fail('Description is required.');

  // Match casing without changing the names written to the CSV.
  const findName = (names, value) => names.find(name => name.toLowerCase() === value.toLowerCase());
  let Category = '';
  let Subcategory = '';
  if (category) {
    Category = findName(Object.keys(categories), category) || '';
    if (!Category) warnings.push(`Line ${rowNumber}: category "${category}" does not exist and will not be saved.`);
  }
  if (subcategory) {
    Subcategory = Category ? findName(categories[Category], subcategory) || '' : '';
    if (!Subcategory) warnings.push(`Line ${rowNumber}: subcategory "${subcategory}" is not valid for this category and will not be saved.`);
  }
  return {
    transaction: {
      DateTime: date.replace(/T(\d{2}:\d{2})(?=Z|[+-]|$)/, 'T$1:00'),
      Amount, Description: description, Category, Subcategory
    },
    hasCategory: fields.length >= 4,
    hasSubcategory: fields.length >= 5,
    warnings
  };
}
