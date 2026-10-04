import { apiClient } from './client';

export const reportsApi = {
  getDashboard: () => apiClient('/api/reports/dashboard/'),
  getProfit: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/reports/profit/${qs ? `?${qs}` : ''}`);
  },
  getSales: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/reports/sales/${qs ? `?${qs}` : ''}`);
  },
  getPurchases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/reports/purchases/${qs ? `?${qs}` : ''}`);
  },
  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/reports/inventory/${qs ? `?${qs}` : ''}`);
  },
};
