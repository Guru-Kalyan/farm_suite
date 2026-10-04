import { apiClient } from './client';

export const farmingApi = {
  // Cultivation Batches
  getBatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/farming/cultivation/${qs ? `?${qs}` : ''}`);
  },
  getBatch: (id) => apiClient(`/api/farming/cultivation/${id}/`),
  createBatch: (data) => apiClient('/api/farming/cultivation/', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => apiClient(`/api/farming/cultivation/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // Harvests
  getHarvests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/farming/harvest/${qs ? `?${qs}` : ''}`);
  },
  getHarvest: (id) => apiClient(`/api/farming/harvest/${id}/`),
  createHarvest: (data) => apiClient('/api/farming/harvest/', { method: 'POST', body: JSON.stringify(data) }),
  postHarvest: (id) => apiClient(`/api/farming/harvest/${id}/post/`, { method: 'POST' }),
};
