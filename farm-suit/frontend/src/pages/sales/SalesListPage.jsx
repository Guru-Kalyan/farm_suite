import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadSalesBillPdf } from '../../utils/pdfDownload';
import { useToast } from '../../hooks/useToast';

export const SalesListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSales = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await salesApi.getSales(params);
      if (res && res.data) {
        setSales(res.data.sales || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load sales bills', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchSales(1);
  }, [fetchSales]);

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
      key: 'customer',
      header: 'Customer',
      render: (val) => <span style={{ fontWeight: '600' }}>{val?.customer_name}</span>
    },
    {
      key: 'bill_date',
      header: 'Invoice Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'grand_total',
      header: 'Total Amount',
      render: (val) => <span style={{ fontWeight: '800' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDownload(e, row)}
            title="Download PDF"
          >
            📥 PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate(`/sales/${row.id}`)}>
            View Details →
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Customer Sales Bills & Invoices</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Unified billing engine with FIFO lot cost deduction and official PDF generation
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate('/sales/new')}>
          + Create Sales Bill
        </Button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by invoice no. or customer..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSED">Reversed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        onRowClick={(row) => onNavigate(`/sales/${row.id}`)}
        emptyMessage="No sales bills recorded yet."
      />

      <Pagination pagination={pagination} onPageChange={fetchSales} />
    </div>
  );
};
