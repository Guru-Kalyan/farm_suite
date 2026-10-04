export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatQuantity(value, unit = '') {
  if (value === null || value === undefined || value === '') return `0 ${unit}`.trim();
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `0 ${unit}`.trim();

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(num);

  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch (_) {
    return dateString;
  }
}

export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch (_) {
    return dateTimeString;
  }
}
