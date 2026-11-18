const categoryMap = {
  food: { icon: 'bi-cup-hot-fill', color: 'bg-danger' },
  dining: { icon: 'bi-shop', color: 'bg-danger' },
  restaurant: { icon: 'bi-shop', color: 'bg-danger' },
  rent: { icon: 'bi-house-fill', color: 'bg-warning text-dark' },
  housing: { icon: 'bi-house-fill', color: 'bg-warning text-dark' },
  phone: { icon: 'bi-telephone-fill', color: 'bg-primary' },
  utilities: { icon: 'bi-lightning-charge-fill', color: 'bg-primary' },
  transport: { icon: 'bi-car-front-fill', color: 'bg-success' },
  entertainment: { icon: 'bi-film', color: 'text-bg-secondary' },
  shopping: { icon: 'bi-bag-fill', color: 'bg-danger' },
  health: { icon: 'bi-heart-pulse-fill', color: 'bg-danger' },
  kids: { icon: 'bi-person-hearts', color: 'bg-info' },
  insurance: {
    icon: 'bi-shield-fill-check',
    color: 'bg-warning text-dark',
  } /* Based on image "Assicurazione" is orange */,
  software: { icon: 'bi-laptop', color: 'bg-primary' },
  default: { icon: 'bi-receipt-cutoff', color: 'bg-secondary' },
};

export function getCategoryMeta(category) {
  if (!category) return categoryMap['default'];
  const lower = category.toLowerCase();
  for (const key in categoryMap) {
    if (lower.includes(key)) return categoryMap[key];
  }
  const colors = [
    'bg-primary',
    'bg-success',
    'bg-danger',
    'bg-warning text-dark',
    'bg-info',
    'bg-secondary',
  ];
  const hash = category
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { icon: 'bi-tag-fill', color: colors[hash % colors.length] };
}
