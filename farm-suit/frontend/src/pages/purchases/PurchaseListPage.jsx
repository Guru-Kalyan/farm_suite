import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { WhatsAppShareButton } from '../../components/common/WhatsAppShareButton';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadPurchaseBillPdf } from '../../utils/pdfDownload';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export const PurchaseListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    mastersApi.getVendors().then(res => {
      if (res && res.data && res.data.vendors) {
        setVendors(res.data.vendors);
      }
    }).catch(() => {});
  }, []);

  const fetchPurchases = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (vendorId) params.vendor_id = vendorId;
      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      if (datePreset) params.date_preset = datePreset;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await purchasesApi.getPurchases(params);
      if (res && res.data) {
        setPurchases(res.data.purchases || []);
        setSummary(res.data.summary || null);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load purchase bills', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, vendorId, statusFilter, paymentStatusFilter, datePreset, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchPurchases(1);
  }, [fetchPurchases]);

  const handleClearFilters = () => {
    setSearch('');
    setVendorId('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setDatePreset('');
    setFromDate('');
    setToDate('');
  };

  const handleDownload = async (e, bill) => {
    e.stopPropagation();
    try {
      addToast('Downloading purchase bill PDF...', 'info');
      await downloadPurchaseBillPdf(bill.id, bill.bill_number);
      addToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  const columns = [
    {
      key: 'bill_number',
      header: 'Purchase Bill No.',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
          <AuditTooltip model="PurchaseBill" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'vendor',
      header: 'Vendor / Supplier',
      render: (val) => (
        <div>
          <div style={{ fontWeight: '600' }}>{val?.vendor_name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val?.vendor_code}</div>
        </div>
      )
    },
    {
      key: 'bill_date',
      header: 'Bill Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'grand_total',
      header: 'Vendor Payable',
      render: (val) => <span style={{ fontWeight: '700' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'total_landed_cost',
      header: 'Landed Cost',
      render: (val) => (
        <span style={{ fontWeight: '800', color: '#0369a1' }}>
          {formatCurrency(val)}
        </span>
      )
    },
    {
      key: 'amount_paid',
      header: 'Paid',
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
          <WhatsAppShareButton bill={row} type="purchase" />

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={(e) => handleDownload(e, row)}
            title="Download Official PDF Purchase Bill"
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

          <Button variant="ghost" size="sm" onClick={() => onNavigate(`/purchases/${row.id}`)}>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Trade Purchases & Landed Cost</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            External vendor procurement with landed cost allocation (transport & packaging), stock receipt, and vendor payment tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/trade/vendor-payments')}>
            💳 Vendor Payments
          </Button>
          {hasPermission('purchases.create') && (
            <Button variant="primary" onClick={() => onNavigate('/purchases/new')}>
              + New Purchase Bill
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards (Section 5.1 & 5.2) */}
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
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Total Purchases
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)' }}>
              {formatCurrency(summary.total_purchases)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Base vendor bills
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Total Landed Cost
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: '#0369a1' }}>
              {formatCurrency(summary.total_landed_cost)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Overhead: +{formatCurrency(parseFloat(summary.total_transport || 0) + parseFloat(summary.total_packaging || 0) + parseFloat(summary.total_other_costs || 0))}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Paid to Vendors
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--success-text)' }}>
              {formatCurrency(summary.total_paid)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.paid_bills} bills fully settled
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Outstanding Payables
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: 'var(--danger-text)' }}>
              {formatCurrency(summary.total_outstanding)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {summary.unpaid_bills} unpaid, {summary.partially_paid_bills} partial
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by bill no. or vendor..."
            />
          </div>

          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px'
            }}
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>
            ))}
          </select>

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

        {/* Date presets row */}
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

          <span style={{ color: 'var(--text-muted)' }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setDatePreset(''); }}
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
            onChange={(e) => { setToDate(e.target.value); setDatePreset(''); }}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          />

          <Button variant="ghost" size="sm" onClick={handleClearFilters} style={{ marginLeft: 'auto' }}>
            ✕ Clear Filters
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        onRowClick={(row) => onNavigate(`/purchases/${row.id}`)}
        emptyMessage="No trade purchase bills matching criteria."
      />

      <Pagination pagination={pagination} onPageChange={fetchPurchases} />
    </div>
  );
};
