import React, { useState, useEffect, useCallback } from 'react';
import { ledgersApi } from '../../api/ledgers';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const TransactionStatementsPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [accountType, setAccountType] = useState('CUSTOMER'); // 'CUSTOMER' or 'VENDOR'
  const [partyId, setPartyId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Statement data
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
      }
    }).catch(() => {});

    mastersApi.getVendors().then(res => {
      if (res && res.data && res.data.vendors) {
        setVendors(res.data.vendors);
      }
    }).catch(() => {});
  }, []);

  const fetchStatement = useCallback(async () => {
    if (!partyId) {
      setStatement(null);
      return;
    }
    try {
      setLoading(true);
      const params = {};
      if (fromDate) params.start_date = fromDate;
      if (toDate) params.end_date = toDate;

      let res;
      if (accountType === 'CUSTOMER') {
        res = await ledgersApi.getCustomerStatement(partyId, params);
      } else {
        res = await ledgersApi.getVendorStatement(partyId, params);
      }

      if (res && res.data) {
        setStatement(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load statement', 'error');
    } finally {
      setLoading(false);
    }
  }, [accountType, partyId, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handlePrint = () => {
    window.print();
  };

  const isCustomer = accountType === 'CUSTOMER';
  const partyList = isCustomer
    ? customers.map(c => ({ value: c.id, label: `${c.name} (${c.code || ''})` }))
    : vendors.map(v => ({ value: v.id, label: `${v.vendor_name} (${v.vendor_code || ''})` }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Transaction Statements</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Generate on-demand chronological statements of account for any customer or supplier
          </p>
        </div>

        {statement && (
          <Button variant="secondary" onClick={handlePrint}>
            🖨️ Print Statement
          </Button>
        )}
      </div>

      {/* Account Selector & Filters Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        alignItems: 'flex-end'
      }}>
        <Select
          label="Account Category"
          value={accountType}
          onChange={(e) => {
            setAccountType(e.target.value);
            setPartyId('');
            setStatement(null);
          }}
          options={[
            { value: 'CUSTOMER', label: 'Customer Account (Receivables)' },
            { value: 'VENDOR', label: 'Vendor Account (Payables)' }
          ]}
        />

        <Select
          label={isCustomer ? 'Select Customer' : 'Select Vendor'}
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
          options={[
            { value: '', label: `-- Choose ${isCustomer ? 'Customer' : 'Vendor'} --` },
            ...partyList
          ]}
        />

        <Input
          label="From Date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <Input
          label="To Date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {/* Content Area */}
      {!partyId ? (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '60px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
          <div style={{ fontSize: '15px', fontWeight: '600' }}>Please select an account to generate statement</div>
          <p style={{ margin: '4px 0 16px 0', fontSize: '13px' }}>
            Choose either a customer or vendor above to view their running debits, credits, and balance history.
          </p>
          <div style={{ display: 'inline-flex', gap: '10px' }}>
            <Button variant="ghost" onClick={() => onNavigate('/accounts/customers')}>
              Browse Customer Accounts
            </Button>
            <Button variant="ghost" onClick={() => onNavigate('/accounts/vendors')}>
              Browse Vendor Accounts
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Generating statement of account...
        </div>
      ) : statement ? (
        <>
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
                {formatCurrency(statement.summary?.opening_balance)}
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
                Total Debits
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                {formatCurrency(statement.summary?.total_debits)}
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
                Total Credits
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                {formatCurrency(statement.summary?.total_credits)}
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
                color: statement.summary?.balance_type === 'Dr' ? 'var(--danger)' : 'var(--success)',
                marginTop: '4px'
              }}>
                {formatCurrency(statement.summary?.closing_balance)}
                <span style={{ fontSize: '11px', marginLeft: '4px' }}>{statement.summary?.balance_type}</span>
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {isCustomer ? statement.customer?.name : statement.vendor?.name} — Statement of Account
              </h3>
            </div>

            {(!statement.statement || statement.statement.length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No transactions found for the selected period.
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
                    {statement.statement.map((row, idx) => (
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
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: parseFloat(row.credit) > 0 ? '700' : 'normal' }}>
                          {parseFloat(row.credit) > 0 ? formatCurrency(row.credit) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800' }}>
                          {formatCurrency(row.running_balance)}
                          <span style={{ fontSize: '10.5px', marginLeft: '4px' }}>
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
        </>
      ) : null}
    </div>
  );
};
