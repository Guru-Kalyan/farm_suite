import { apiClient } from './client';

export const ordersApi = {
  getOrders: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/orders/${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id) => apiClient(`/api/orders/${id}/`),
  createOrder: (data) => apiClient('/api/orders/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateStatus: (id, status, notes = '') => apiClient(`/api/orders/${id}/status/`, {
    method: 'POST',
    body: JSON.stringify({ status, notes })
  }),
  getAdvances: (id) => apiClient(`/api/orders/${id}/advances/`),
  recordAdvance: (id, data) => apiClient(`/api/orders/${id}/advances/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  fulfillOrder: (id, postNow = true) => apiClient(`/api/orders/${id}/fulfill/`, {
    method: 'POST',
    body: JSON.stringify({ post_now: postNow })
  }),
  getCalendar: () => apiClient('/api/orders/calendar/'),
};
