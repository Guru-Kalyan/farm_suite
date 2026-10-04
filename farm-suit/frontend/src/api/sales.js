import { apiClient } from './client';

export const salesApi = {
  getSales: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
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
};
