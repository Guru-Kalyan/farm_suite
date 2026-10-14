import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { WhatsAppShareButton } from '../../components/common/WhatsAppShareButton';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadSalesBillPdf } from '../../utils/pdfDownload';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export const SalesListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Load customers for filter dropdown
  useEffect(() => {
    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
      }
    }).catch(() => {});
  }, []);

  const fetchSales = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (customerId) params.customer_id = customerId;
      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      if (saleTypeFilter) params.sale_type = saleTypeFilter;
      if (datePreset) params.date_preset = datePreset;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (month) params.month = month;
      if (year) params.year = year;

      const res = await salesApi.getSales(params);
      if (res && res.data) {
        setSales(res.data.sales || []);
        setSummary(res.data.summary || null);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load sales bills', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, customerId, statusFilter, paymentStatusFilter, saleTypeFilter, datePreset, fromDate, toDate, month, year, addToast]);

  useEffect(() => {
    fetchSales(1);
  }, [fetchSales]);

  const handleClearFilters = () => {
    setSearch('');
    setCustomerId('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setSaleTypeFilter('');
    setDatePreset('');
    setFromDate('');
    setToDate('');
    setMonth('');
    setYear('');
  };

  const handleDownload = async (e, bill) => {
    e.stopPropagation();
    try {
      addToast('Downloading invoice PDF...', 'info');
      await downloadSalesBillPdf(bill.id, bill.bill_number);
      addToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  const columns = [
    {
      key: 'bill_number',
      header: 'Invoice No.',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
          <AuditTooltip model="SalesBill" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'sale_type',
      header: 'Type',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (val) => (
        <div>
          <div style={{ fontWeight: '600' }}>{val?.customer_name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val?.customer_code}</div>
        </div>
      )
    },
    {
      key: 'bill_date',
      header: 'Invoice Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'grand_total',
      header: 'Total Value',
      render: (val) => <span style={{ fontWeight: '700' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'amount_paid',
      header: 'Received',
      render: (val) => <span style={{ fontWeight: '600', color: 'var(--success-text)' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'remaining_balance',
      header: 'Outstanding',
      render: (val) => {
        const num = parseFloat(val || 0);
        return (
          <span style={{ fontWeight: '700', color: num > 0 ? 'var(--danger-text)' : 'var(--text-muted)' }}>
            {formatCurrency(val)}
          </span>
        );
      }
    },
    {
      key: 'payment_status',
      header: 'Payment Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'status',
      header: 'Bill Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* WhatsApp Share Button */}
          <WhatsAppShareButton bill={row} type={row.sale_type === 'TRADE' ? 'trade_sale' : 'sales'} />

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={(e) => handleDownload(e, row)}
            title="Download Official PDF Invoice"
            style={{
              padding: '5px 9px',
              backgroundColor: 'var(--bg-surface-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📥 PDF
          </button>

          <Button variant="ghost" size="sm" onClick={() => onNavigate(`/sales/${row.id}`)}>
            View →
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Sales History & Invoicing</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Comprehensive billing management with partial payments, live status tracking, and WhatsApp sharing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/sales/payments')}>
            💳 Payments Received
          </Button>
          {hasPermission('sales.create') && (
            <Button variant="primary" onClick={() => onNavigate('/sales/new')}>
              + Create Sales Bill
            </Button>
          )}
        </div>
      </div>

      {/* Sales Summary KPI Cards (Section 4.5) */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
              Total Sales
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)' }}>
              {formatCurrency(summary.total_sales)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.total_bills} bills posted
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
              Amount Received
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--success-text)' }}>
              {formatCurrency(summary.total_received)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Collected to date
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
              Total Outstanding
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--danger-text)' }}>
              {formatCurrency(summary.total_outstanding)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Uncollected balance
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
              Payment Breakdown
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--success-text)', fontWeight: '700' }}>
                ● {summary.paid_bills} Paid
              </span>
              <span style={{ fontSize: '11px', color: 'var(--warning-text)', fontWeight: '700' }}>
                ● {summary.partially_paid_bills} Partial
              </span>
              <span style={{ fontSize: '11px', color: 'var(--danger-text)', fontWeight: '700' }}>
                ● {summary.unpaid_bills} Unpaid
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Filter Toolbar (Section 4.4) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Row 1: Search & Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by invoice no. or customer..."
            />
          </div>

          {/* Customer filter */}
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px'
            }}
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>
            ))}
          </select>

          {/* Payment Status filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: paymentStatusFilter ? '700' : 'normal'
            }}
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Sale Type filter */}
          <select
            value={saleTypeFilter}
            onChange={(e) => setSaleTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px'
            }}
          >
            <option value="">All Sale Types</option>
            <option value="REGULAR">Regular Farm Sale</option>
            <option value="TRADE">Trade Sale</option>
          </select>

          {/* Bill Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px'
            }}
          >
            <option value="">All Bill Statuses</option>
            <option value="POSTED">Posted</option>
            <option value="DRAFT">Draft</option>
            <option value="REVERSED">Reversed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Row 2: Date Presets & Custom Ranges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
          <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Date Presets:</span>
          {[
            { key: '', label: 'All Dates' },
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: 'prev_month', label: 'Previous Month' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setDatePreset(p.key);
                setFromDate('');
                setToDate('');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: datePreset === p.key && !fromDate ? 'var(--primary)' : 'var(--bg-surface-secondary)',
                color: datePreset === p.key && !fromDate ? '#ffffff' : 'var(--text-primary)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}

          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Custom Date Inputs */}
          <span style={{ color: 'var(--text-muted)' }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setDatePreset('');
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setDatePreset('');
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />

          {/* Clear Filters Button */}
          <Button variant="ghost" size="sm" onClick={handleClearFilters} style={{ marginLeft: 'auto' }}>
            ✕ Clear Filters
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        onRowClick={(row) => onNavigate(`/sales/${row.id}`)}
        emptyMessage="No sales bills matching the selected filter criteria."
      />

      <Pagination pagination={pagination} onPageChange={fetchSales} />
    </div>
  );
};
