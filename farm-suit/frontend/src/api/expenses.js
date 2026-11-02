import { apiClient } from './client';

export const expensesApi = {
  getExpenses: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/expenses/${qs ? `?${qs}` : ''}`);
  },

  getExpense: (id) => apiClient(`/api/accounts/expenses/${id}/`),

  createExpense: (data) => apiClient('/api/accounts/expenses/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateExpense: (id, data) => apiClient(`/api/accounts/expenses/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteExpense: (id) => apiClient(`/api/accounts/expenses/${id}/`, {
    method: 'DELETE'
  })
};

