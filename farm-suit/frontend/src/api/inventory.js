import { apiClient } from './client';

export const inventoryApi = {
  getOverview: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/inventory/${qs ? `?${qs}` : ''}`);
  },
  getLots: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/inventory/lots/${qs ? `?${qs}` : ''}`);
  },
  getLot: (id) => apiClient(`/api/inventory/lots/${id}/`),
  getMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/inventory/movements/${qs ? `?${qs}` : ''}`);
  },
};
