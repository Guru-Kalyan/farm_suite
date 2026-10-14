import React, { useState, useEffect, useCallback } from 'react';
import { ledgersApi } from '../../api/ledgers';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PayablesPrioritizationPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPriorities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ledgersApi.getPayables();
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load payables prioritization', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Vendor Payables Prioritization</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Objective ranking of outstanding supplier liabilities by volume and aging to plan disbursement schedules
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/accounts/vendors')}>
            ← Vendor Accounts
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('/accounts/receivables')}>
            Customer Receivables →
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Analyzing vendor ledger aging and disbursement liabilities...
        </div>
      ) : (() => {
        const vendorList = data.vendors || data.payables || [];
        const totalPayables = data.total_payables || data.portfolio_summary?.total_payables || '0.00';
        const agingTotals = data.aging_totals || {
          '0_30_days': vendorList.reduce((acc, v) => acc + parseFloat(v.aging_0_30 || v.aging?.['0_30_days'] || 0), 0),
          '31_60_days': vendorList.reduce((acc, v) => acc + parseFloat(v.aging_31_60 || v.aging?.['31_60_days'] || 0), 0),
          '60_plus_days': vendorList.reduce((acc, v) => acc + parseFloat(v.aging_60_plus || v.aging?.['60_plus_days'] || 0), 0)
        };

        return (
          <>
            {/* Summary KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                  Total Payables
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                  {formatCurrency(totalPayables)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Across {vendorList.length} vendor accounts
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '18px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current (0 - 30 Days)
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {formatCurrency(agingTotals['0_30_days'])}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Recent purchases within payment terms
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '18px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase' }}>
                  31 - 60 Days Aging
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
                  {formatCurrency(agingTotals['31_60_days'])}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Pending payment allocation
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '18px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase' }}>
                  60+ Days (Critical Payables)
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                  {formatCurrency(agingTotals['60_plus_days'])}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Long outstanding liabilities
                </div>
              </div>
            </div>

            {/* Prioritized Payables Table */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ranked Supplier Payables</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Sorted by highest outstanding payable liability with aging categorization
                </p>
              </div>

              {vendorList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No outstanding vendor payables! All supplier bills are fully cleared.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Rank / Vendor</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Payable (₹)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>0 - 30 Days (₹)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>31 - 60 Days (₹)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>60+ Days (₹)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Oldest Unpaid Bill</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorList.map((v, idx) => {
                        const targetId = v.vendor_id || v.id;
                        const outstanding = v.outstanding_payable || v.outstanding_balance || 0;
                        const age0_30 = v.aging?.['0_30_days'] ?? v.aging_0_30 ?? '0.00';
                        const age31_60 = v.aging?.['31_60_days'] ?? v.aging_31_60 ?? '0.00';
                        const age60plus = v.aging?.['60_plus_days'] ?? v.aging_60_plus ?? '0.00';
                        const oldestDate = v.oldest_unpaid_date || v.oldest_unpaid_bill_date;

                        return (
                          <tr
                            key={targetId || idx}
                            onClick={() => onNavigate(`/accounts/vendors/${targetId}/statement`)}
                            style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-block',
                                width: '22px',
                                height: '22px',
                                lineHeight: '22px',
                                textAlign: 'center',
                                borderRadius: '50%',
                                backgroundColor: idx < 3 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-secondary)',
                                color: idx < 3 ? 'var(--danger)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '11px',
                                marginRight: '8px'
                              }}>
                                {idx + 1}
                              </span>
                              <b>{v.vendor_name}</b>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>[{v.vendor_code}]</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {v.phone || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: 'var(--danger)', fontSize: '14px' }}>
                              {formatCurrency(outstanding)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {formatCurrency(age0_30)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: parseFloat(age31_60) > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: '600' }}>
                              {formatCurrency(age31_60)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: parseFloat(age60plus) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '800' }}>
                              {formatCurrency(age60plus)}
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                              {oldestDate ? formatDate(oldestDate) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onNavigate(`/accounts/vendors/${targetId}/statement`)}
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
          </>
        );
      })()}
    </div>
  );
};
