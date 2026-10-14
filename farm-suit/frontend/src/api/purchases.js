import { apiClient } from './client';

export const purchasesApi = {
  getPurchases: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/purchases/${qs ? `?${qs}` : ''}`);
  },
  getPurchase: (id) => apiClient(`/api/purchases/${id}/`),
  createPurchase: (data) => apiClient('/api/purchases/', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchase: (id, data) => apiClient(`/api/purchases/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  postPurchase: (id) => apiClient(`/api/purchases/${id}/post/`, { method: 'POST' }),
  reversePurchase: (id, reason) => apiClient(`/api/purchases/${id}/reverse/`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  getPdfBlob: (id) => apiClient(`/api/purchases/${id}/pdf/`, { responseType: 'blob' }),

  // Vendor Payments
  getVendorPayments: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/purchases/vendor-payments/${qs ? `?${qs}` : ''}`);
  },
  getAllVendorPayments: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/purchases/vendor-payments/${qs ? `?${qs}` : ''}`);
  },
  getBillPayments: (billId) => apiClient(`/api/purchases/${billId}/payments/`),
  recordPayment: (billId, data) => apiClient(`/api/purchases/${billId}/payments/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Trade Profit Dashboard
  getTradeDashboard: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/purchases/trade-dashboard/${qs ? `?${qs}` : ''}`);
  },
};
