import { apiClient } from './client';

export const mastersApi = {
  // Categories
  getCategories: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/categories/${qs ? `?${qs}` : ''}`);
  },
  createCategory: (data) => apiClient('/api/masters/categories/', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiClient(`/api/masters/categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => apiClient(`/api/masters/categories/${id}/`, { method: 'DELETE' }),

  // Units
  getUnits: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/units/${qs ? `?${qs}` : ''}`);
  },
  createUnit: (data) => apiClient('/api/masters/units/', { method: 'POST', body: JSON.stringify(data) }),
  updateUnit: (id, data) => apiClient(`/api/masters/units/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUnit: (id) => apiClient(`/api/masters/units/${id}/`, { method: 'DELETE' }),

  // Items
  getItems: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/items/${qs ? `?${qs}` : ''}`);
  },
  getItem: (id) => apiClient(`/api/masters/items/${id}/`),
  createItem: (data) => apiClient('/api/masters/items/', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => apiClient(`/api/masters/items/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => apiClient(`/api/masters/items/${id}/`, { method: 'DELETE' }),

  // Vendors
  getVendors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/vendors/${qs ? `?${qs}` : ''}`);
  },
  getVendor: (id) => apiClient(`/api/masters/vendors/${id}/`),
  createVendor: (data) => apiClient('/api/masters/vendors/', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id, data) => apiClient(`/api/masters/vendors/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id) => apiClient(`/api/masters/vendors/${id}/`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/customers/${qs ? `?${qs}` : ''}`);
  },
  getCustomer: (id) => apiClient(`/api/masters/customers/${id}/`),
  createCustomer: (data) => apiClient('/api/masters/customers/', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => apiClient(`/api/masters/customers/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => apiClient(`/api/masters/customers/${id}/`, { method: 'DELETE' }),

  // Farm Plots
  getFarmPlots: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/api/masters/farm-plots/${qs ? `?${qs}` : ''}`);
  },
  getFarmPlot: (id) => apiClient(`/api/masters/farm-plots/${id}/`),
  createFarmPlot: (data) => apiClient('/api/masters/farm-plots/', { method: 'POST', body: JSON.stringify(data) }),
  updateFarmPlot: (id, data) => apiClient(`/api/masters/farm-plots/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFarmPlot: (id) => apiClient(`/api/masters/farm-plots/${id}/`, { method: 'DELETE' }),
};
