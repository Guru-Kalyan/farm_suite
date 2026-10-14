import React, { useState, useEffect, useCallback } from 'react';
import { ledgersApi } from '../../api/ledgers';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const CustomerStatementPage = ({ id, onNavigate }) => {
  const { addToast } = useToast();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchStatement = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (fromDate) params.start_date = fromDate;
      if (toDate) params.end_date = toDate;

      const res = await ledgersApi.getCustomerStatement(id, params);
      if (res && res.data) {
        setStatement(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load customer statement', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !statement) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading customer statement and transaction ledger...
      </div>
    );
  }

  const { customer, summary, aging, statement: ledgerEntries } = statement;
  const isDebit = summary.balance_type === 'Dr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Customer Ledger: {customer.name}</h1>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '12px',
              backgroundColor: isDebit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: isDebit ? 'var(--danger)' : 'var(--success)'
            }}>
              {summary.closing_balance} {summary.balance_type}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Code: <b>{customer.code}</b> • Phone: {customer.phone || '—'} • {customer.address || ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/accounts/customers')}>
            ← Back to Accounts
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            🖨️ Print Statement
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'flex-end'
      }}>
        <div style={{ minWidth: '140px' }}>
          <Input
            label="Statement From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '140px' }}>
          <Input
            label="Statement To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {(fromDate || toDate) && (
          <Button variant="ghost" onClick={() => { setFromDate(''); setToDate(''); }}>
            Reset Dates
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Opening Balance
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {formatCurrency(summary.opening_balance)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Prior period carry-forward
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Period Debits (Sales)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(summary.total_debits)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Billed customer charges
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Period Credits (Receipts)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
            {formatCurrency(summary.total_credits)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Payments & unapplied advances
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Closing Balance
          </div>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: '800',
            color: isDebit ? 'var(--danger)' : 'var(--success)',
            marginTop: '4px'
          }}>
            {formatCurrency(summary.closing_balance)}
            <span style={{ fontSize: '11px', marginLeft: '4px' }}>{summary.balance_type}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isDebit ? 'Amount Receivable (Dr)' : 'Advance / Credit Balance (Cr)'}
          </div>
        </div>
      </div>

      {/* Aging Breakdown */}
      {aging && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Receivable Aging Schedule
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>0 - 30 Days:</span>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {formatCurrency(aging['0_30_days'])}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>31 - 60 Days:</span>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--warning)' }}>
                {formatCurrency(aging['31_60_days'])}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>60+ Days (Overdue):</span>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
                {formatCurrency(aging['60_plus_days'])}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Statement Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Chronological Statement of Account</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Debits increase customer receivable balance; Credits represent collections and advances received
          </p>
        </div>

        {ledgerEntries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found in this statement period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Reference #</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Transaction</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Details</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Credit (₹)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {formatDate(row.date)}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                      {row.reference_number}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: 'var(--bg-surface-secondary)'
                      }}>
                        {row.transaction_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {row.description}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: parseFloat(row.debit) > 0 ? '700' : 'normal' }}>
                      {parseFloat(row.debit) > 0 ? formatCurrency(row.debit) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--success)', fontWeight: parseFloat(row.credit) > 0 ? '700' : 'normal' }}>
                      {parseFloat(row.credit) > 0 ? formatCurrency(row.credit) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800' }}>
                      {formatCurrency(row.running_balance)}
                      <span style={{ fontSize: '10.5px', marginLeft: '4px', color: row.balance_sign === 'Dr' ? 'var(--danger)' : 'var(--success)' }}>
                        {row.balance_sign}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
