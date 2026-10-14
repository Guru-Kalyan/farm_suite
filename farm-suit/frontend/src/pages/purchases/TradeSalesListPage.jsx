import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { WhatsAppShareButton } from '../../components/common/WhatsAppShareButton';
import { generateSaleWhatsAppUrl } from '../../utils/whatsappShare';
import { downloadSalesInvoicePdf } from '../../utils/pdfDownload';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const TradeSalesListPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  // Filters
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
      }
    }).catch(() => {});
  }, []);

  const fetchTradeSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = { sale_type: 'TRADE' };
      if (customerId) params.customer_id = customerId;
      if (paymentStatus) params.payment_status = paymentStatus;
      if (datePreset) params.date_preset = datePreset;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (search) params.search = search;

      const res = await salesApi.getSales(params);
      if (res && res.data) {
        setSales(res.data.bills || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load trade sales', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerId, paymentStatus, datePreset, fromDate, toDate, search, addToast]);

  useEffect(() => {
    fetchTradeSales();
  }, [fetchTradeSales]);

  const handleClearFilters = () => {
    setCustomerId('');
    setPaymentStatus('');
    setDatePreset('');
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const handlePdfDownload = async (e, bill) => {
    e.stopPropagation();
    try {
      await downloadSalesInvoicePdf(bill.id, bill.bill_number);
      addToast(`Downloaded PDF for Trade Sale ${bill.bill_number}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download invoice PDF', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Trade Sales</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Goods bought from external suppliers and resold to customers with landed COGS and margin tracking
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onNavigate('/trade/profit')}>
            📊 Trade Profit & Margin
          </Button>
          <Button variant="primary" onClick={() => onNavigate('/sales/create?type=TRADE')}>
            + New Trade Sale
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
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
              Trade Sales Revenue
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
              {formatCurrency(summary.total_sales)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.total_bills} trade invoices
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
              Amount Collected
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
              {formatCurrency(summary.total_amount_received)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.paid_bills} fully paid
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
              Trade Receivables
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
              {formatCurrency(summary.total_outstanding)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.unpaid_bills} unpaid bills
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
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
          <Input
            label="Search Bill #"
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <Select
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.code || ''})` }))
            ]}
          />
        </div>

        <div style={{ minWidth: '140px' }}>
          <Select
            label="Payment Status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PAID', label: 'Paid' },
              { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { value: 'UNPAID', label: 'Unpaid' }
            ]}
          />
        </div>

        <div style={{ minWidth: '140px' }}>
          <Select
            label="Date Preset"
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setFromDate('');
              setToDate('');
            }}
            options={[
              { value: '', label: 'Custom Range' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'this_week', label: 'This Week' },
              { value: 'this_month', label: 'This Month' },
              { value: 'prev_month', label: 'Previous Month' }
            ]}
          />
        </div>

        {!datePreset && (
          <>
            <div style={{ minWidth: '130px' }}>
              <Input
                label="From"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '130px' }}>
              <Input
                label="To"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}

        <Button variant="ghost" onClick={handleClearFilters}>
          Clear
        </Button>
      </div>

      {/* Trade Sales Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading trade sales...
          </div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No trade sales found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bill Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Revenue (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Received (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Balance (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Payment Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const balance = parseFloat(s.remaining_balance || 0);

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onNavigate(`/sales/${s.id}`)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                        {s.bill_number}
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          padding: '2px 6px',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--primary)',
                          borderRadius: '4px'
                        }}>
                          TRADE
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {formatDate(s.bill_date)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <b>{s.customer?.name}</b>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.customer?.code}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>
                        {formatCurrency(s.total_amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--success)', fontWeight: '600' }}>
                        {formatCurrency(s.amount_paid)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: balance > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {formatCurrency(balance)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <StatusBadge status={s.payment_status || 'UNPAID'} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <WhatsAppShareButton
                            shareUrl={generateSaleWhatsAppUrl(s)}
                            label=""
                            title="Share invoice on WhatsApp"
                          />
                          <button
                            type="button"
                            onClick={(e) => handlePdfDownload(e, s)}
                            title="Download Tax Invoice PDF"
                            style={{
                              background: 'none',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            📄
                          </button>
                        </div>
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
