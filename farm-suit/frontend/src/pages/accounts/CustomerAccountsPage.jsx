import React, { useState, useEffect, useCallback } from 'react';
import { ledgersApi } from '../../api/ledgers';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const CustomerAccountsPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [totalReceivables, setTotalReceivables] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const res = await ledgersApi.getCustomerLedgers(params);
      if (res && res.data) {
        setCustomers(res.data.customers || []);
        setTotalReceivables(res.data.total_receivables || '0.00');
      }
    } catch (err) {
      addToast(err.message || 'Failed to load customer accounts', 'error');
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
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Customer Accounts & Wallets</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Running account balances, transaction history, and live receivable ledgers for all buyers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onNavigate('/accounts/receivables')}>
            🎯 Prioritize Receivables
          </Button>
          <Button variant="ghost" onClick={() => onNavigate('/accounts/vendors')}>
            Vendor Accounts →
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
            Total Customer Receivables
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(totalReceivables)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Across {customers.length} customer accounts
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
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
            placeholder="Search customer name, code, or phone..."
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

      {/* Customers Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading customer accounts...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No customer accounts found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Phone / Location</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Invoiced (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Received (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current Balance (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Transactions</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Last Activity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statement</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const bal = parseFloat(c.current_balance || 0);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onNavigate(`/accounts/customers/${c.id}/statement`)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <b>{c.customer_name}</b>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.customer_code}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{c.phone || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.village || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(c.total_invoiced)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--success)', fontWeight: '600' }}>
                        {formatCurrency(c.total_received)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', fontSize: '14px', color: bal > 0 ? 'var(--danger)' : bal < 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {formatCurrency(Math.abs(bal))}
                        <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: '700' }}>
                          {c.balance_type}
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
                          {c.transaction_count}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDate(c.last_transaction_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate(`/accounts/customers/${c.id}/statement`)}
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
