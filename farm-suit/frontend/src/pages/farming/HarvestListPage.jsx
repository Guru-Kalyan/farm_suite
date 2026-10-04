import React, { useState, useEffect, useCallback } from 'react';
import { farmingApi } from '../../api/farming';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const HarvestListPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [harvests, setHarvests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHarvests = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await farmingApi.getHarvests(params);
      if (res && res.data) {
        setHarvests(res.data.harvests || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load harvest records', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchHarvests(1);
  }, [fetchHarvests]);

  const handlePost = async (id, harvestNumber) => {
    try {
      await farmingApi.postHarvest(id);
      addToast(`Harvest ${harvestNumber} posted! Unified inventory lot generated.`, 'success');
      fetchHarvests(pagination ? pagination.page : 1);
    } catch (err) {
      addToast(err.message || 'Failed to post harvest', 'error');
    }
  };

  const columns = [
    {
      key: 'harvest_number',
      header: 'Harvest No.',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
          <AuditTooltip model="Harvest" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'batch',
      header: 'Batch & Plot',
      render: (val) => (
        <div>
          <div style={{ fontWeight: '600' }}>{val?.crop}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val?.batch_number} • {val?.plot}</div>
        </div>
      )
    },
    {
      key: 'harvest_date',
      header: 'Date Harvested',
      render: (val) => formatDate(val)
    },
    {
      key: 'quantity',
      header: 'Yield Quantity',
      render: (val, row) => <span style={{ fontWeight: '700' }}>{val} {row.item?.unit}</span>
    },
    {
      key: 'unit_cost',
      header: 'Production Cost',
      render: (val) => `${formatCurrency(val)} / unit`
    },
    {
      key: 'total_cost',
      header: 'Total Valuation',
      render: (val) => <span style={{ fontWeight: '600' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'quality_grade',
      header: 'Grade',
      render: (val) => (
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-text)', backgroundColor: 'var(--accent-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
          {val ? val.replace('_', ' ') : 'Standard'}
        </span>
      )
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
          {row.status === 'DRAFT' && (
            <Button variant="primary" size="sm" onClick={() => handlePost(row.id, row.harvest_number)}>
              ✅ Post to Stock
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Direct Farming Harvest Records</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Record crop yields and post farm produce directly into unified inventory lots
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate('/harvests/new')}>
          + Record Harvest
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search harvests..." />
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
        </select>
      </div>

      <DataTable columns={columns} data={harvests} loading={loading} emptyMessage="No harvests recorded yet." />
      <Pagination pagination={pagination} onPageChange={fetchHarvests} />
    </div>
  );
};
