import { apiClient } from './client';

export const salesApi = {
  getSales: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/sales/${qs ? `?${qs}` : ''}`);
  },
  getSale: (id) => apiClient(`/api/sales/${id}/`),
  createSale: (data) => apiClient('/api/sales/', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id, data) => apiClient(`/api/sales/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  postSale: (id, items) => apiClient(`/api/sales/${id}/post/`, {
    method: 'POST',
    body: JSON.stringify({ items })
  }),
  reverseSale: (id, reason) => apiClient(`/api/sales/${id}/reverse/`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  getPdfBlob: (id) => apiClient(`/api/sales/${id}/pdf/`, { responseType: 'blob' }),

  // Payments Received
  getPayments: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/sales/payments/${qs ? `?${qs}` : ''}`);
  },
  getBillPayments: (billId) => apiClient(`/api/sales/${billId}/payments/`),
  recordPayment: (billId, data) => apiClient(`/api/sales/${billId}/payments/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};
