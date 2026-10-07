import React, { useState, useEffect, useCallback } from 'react';
import { farmingApi } from '../../api/farming';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export const CultivationListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await farmingApi.getBatches(params);
      if (res && res.data) {
        setBatches(res.data.batches || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load cultivation batches', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchBatches(1);
  }, [fetchBatches]);

  const columns = [
    {
      key: 'batch_number',
      header: 'Batch Number',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
          <AuditTooltip model="CultivationBatch" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'item',
      header: 'Crop / Product',
      render: (val) => <span style={{ fontWeight: '600' }}>{val?.name}</span>
    },
    {
      key: 'farm_plot',
      header: 'Farm Plot',
      render: (val) => val?.name || '—'
    },
    {
      key: 'area',
      header: 'Cultivated Area',
      render: (val) => `${val} Acres`
    },
    {
      key: 'start_date',
      header: 'Sown / Started',
      render: (val) => formatDate(val)
    },
    {
      key: 'expected_harvest_date',
      header: 'Expected Harvest',
      render: (val) => formatDate(val)
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
        <Button variant="ghost" size="sm" onClick={() => onNavigate(`/harvests/new?batch_id=${row.id}`)}>
          🚜 Harvest →
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Direct Farming Cultivation</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Schedule and track in-house agricultural cultivation batches across farm plots
          </p>
        </div>
        {hasPermission('crops.create') && (
          <Button variant="primary" onClick={() => onNavigate('/cultivation/new')}>
            + New Cultivation Batch
          </Button>
        )}
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search by batch, crop, or plot..." />
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
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="HARVESTED">Harvested</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable columns={columns} data={batches} loading={loading} emptyMessage="No cultivation batches found." />
      <Pagination pagination={pagination} onPageChange={fetchBatches} />
    </div>
  );
};
