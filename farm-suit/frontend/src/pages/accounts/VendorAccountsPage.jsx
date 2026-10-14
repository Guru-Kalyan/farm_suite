import React, { useState, useEffect, useCallback } from 'react';
import { ledgersApi } from '../../api/ledgers';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const VendorAccountsPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [totalPayables, setTotalPayables] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const res = await ledgersApi.getVendorLedgers(params);
      if (res && res.data) {
        setVendors(res.data.vendors || []);
        setTotalPayables(res.data.total_payables || '0.00');
      }
    } catch (err) {
      addToast(err.message || 'Failed to load vendor accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Vendor Accounts & Wallets</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Running account balances, purchase bills, and disbursement ledgers for all suppliers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onNavigate('/accounts/payables')}>
            🎯 Prioritize Payables
          </Button>
          <Button variant="ghost" onClick={() => onNavigate('/accounts/customers')}>
            Customer Accounts →
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Vendor Payables
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
            {formatCurrency(totalPayables)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Liabilities across {vendors.length} vendor suppliers
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <Input
            placeholder="Search vendor name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Vendors Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading vendor accounts...
          </div>
        ) : vendors.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No vendor accounts found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vendor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Phone</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Invoiced (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Paid (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current Balance (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Bills Count</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Last Transaction</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statement</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => {
                  const bal = parseFloat(v.current_balance || 0);

                  return (
                    <tr
                      key={v.id}
                      onClick={() => onNavigate(`/accounts/vendors/${v.id}/statement`)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <b>{v.vendor_name}</b>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.vendor_code}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {v.phone || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(v.total_procurement)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--success)', fontWeight: '600' }}>
                        {formatCurrency(v.total_paid)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: bal > 0 ? 'var(--danger)' : bal < 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {formatCurrency(Math.abs(bal))}
                        <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: '700' }}>
                          {v.balance_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: 'var(--bg-surface-secondary)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {v.bills_count}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDate(v.last_transaction_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate(`/accounts/vendors/${v.id}/statement`)}
                        >
                          Statement →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
