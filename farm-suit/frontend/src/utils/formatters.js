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
    let str = dateString;
    if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
      str = str + 'T00:00:00+05:30';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
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
    let str = dateTimeString;
    if (typeof str === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
        str = str.replace(' ', 'T') + '+05:30';
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
        str = str + '+05:30';
      }
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
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
