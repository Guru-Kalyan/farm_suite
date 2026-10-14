import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const VendorPaymentsPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [totalAmount, setTotalAmount] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);

  // Filters
  const [vendorId, setVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Fetch vendors master
  useEffect(() => {
    mastersApi.getVendors().then(res => {
      if (res && res.data && res.data.vendors) {
        setVendors(res.data.vendors);
      }
    }).catch(() => {});
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (vendorId) params.vendor_id = vendorId;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await purchasesApi.getAllVendorPayments(params);
      if (res && res.data) {
        setPayments(res.data.payments || []);
        setTotalAmount(res.data.total_amount || '0.00');
      }
    } catch (err) {
      addToast(err.message || 'Failed to load vendor payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [vendorId, paymentMethod, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleClearFilters = () => {
    setVendorId('');
    setPaymentMethod('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Vendor Payments</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Track and audit all payments disbursed to suppliers and trade vendors
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/purchases')}>
            ← Back to Purchases
          </Button>
          <Button variant="primary" onClick={() => onNavigate('/purchases/create')}>
            + New Purchase
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Disbursements
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(totalAmount)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Across {payments.length} recorded payments
          </div>
        </div>
      </div>

      {/* Filters Bar */}
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
        <div style={{ minWidth: '180px', flex: 1 }}>
          <Select
            label="Filter Vendor"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            options={[
              { value: '', label: 'All Vendors' },
              ...vendors.map(v => ({ value: v.id, label: `${v.vendor_name} (${v.vendor_code})` }))
            ]}
          />
        </div>

        <div style={{ minWidth: '140px' }}>
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: '', label: 'All Methods' },
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'UPI', label: 'UPI' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'OTHER', label: 'Other' }
            ]}
          />
        </div>

        <div style={{ minWidth: '130px' }}>
          <Input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '130px' }}>
          <Input
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <Button variant="ghost" onClick={handleClearFilters}>
          Clear
        </Button>
      </div>

      {/* Payments Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading vendor payments...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No vendor payments found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vendor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Purchase Bill</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Method</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reference #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Recorded By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {formatDate(p.payment_date)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <b>{p.vendor?.vendor_name}</b>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.vendor?.vendor_code}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        onClick={() => onNavigate(`/purchases/${p.purchase_bill?.id}`)}
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {p.purchase_bill?.bill_number}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Bill Total: {formatCurrency(p.purchase_bill?.grand_total)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: 'var(--success)', fontSize: '14px' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: '600'
                      }}>
                        {p.payment_method_display || p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                      {p.reference_number || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.recorded_by || 'Admin'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {p.notes || '—'}
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
