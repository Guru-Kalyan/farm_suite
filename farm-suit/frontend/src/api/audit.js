import { apiClient } from './client';

export const auditApi = {
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/audit/${qs ? `?${qs}` : ''}`);
  },
  getEntityTimeline: (model, id) => apiClient(`/api/audit/${model}/${id}/`),
};
