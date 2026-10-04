import { apiClient } from './client';

export const purchasesApi = {
  getPurchases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
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
};
