import { apiClient } from './client';

export const ledgersApi = {
  // Customer Wallets / Ledgers
  getCustomerLedgers: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/customers/${qs ? `?${qs}` : ''}`);
  },
  getCustomerStatement: (customerId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/customers/${customerId}/${qs ? `?${qs}` : ''}`);
  },

  // Vendor Wallets / Ledgers
  getVendorLedgers: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/vendors/${qs ? `?${qs}` : ''}`);
  },
  getVendorStatement: (vendorId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/vendors/${vendorId}/${qs ? `?${qs}` : ''}`);
  },

  // Receivables Prioritization
  getReceivables: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/receivables/${qs ? `?${qs}` : ''}`);
  },

  // Payables Prioritization
  getPayables: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient(`/api/accounts/ledgers/payables/${qs ? `?${qs}` : ''}`);
  },
};
