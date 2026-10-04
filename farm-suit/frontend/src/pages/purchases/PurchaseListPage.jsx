import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPurchases = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await purchasesApi.getPurchases(params);
      if (res && res.data) {
        setPurchases(res.data.purchases || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load purchase bills', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchPurchases(1);
  }, [fetchPurchases]);

  const columns = [
    {
      key: 'bill_number',
      header: 'Bill Number',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
          <AuditTooltip model="PurchaseBill" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'vendor',
      header: 'Vendor',
      render: (val) => <span style={{ fontWeight: '600' }}>{val?.vendor_name}</span>
    },
    {
      key: 'bill_date',
      header: 'Bill Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'received_date',
      header: 'Received Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'grand_total',
      header: 'Grand Total',
      render: (val) => <span style={{ fontWeight: '700' }}>{formatCurrency(val)}</span>
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
          <Button variant="ghost" size="sm" onClick={() => onNavigate(`/purchases/${row.id}`)}>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Vendor Purchase Bills</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Indirect trading inventory procurements from external suppliers
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate('/purchases/new')}>
          + New Purchase Bill
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search by bill number or vendor..." />
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
          <option value="CANCELLED">Cancelled</option>
          <option value="REVERSED">Reversed</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        onRowClick={(row) => onNavigate(`/purchases/${row.id}`)}
        emptyMessage="No purchase bills found."
      />

      <Pagination pagination={pagination} onPageChange={fetchPurchases} />
    </div>
  );
};
