import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventory';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SourceBadge } from '../../components/common/SourceBadge';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const StockLotsPage = ({ onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [lots, setLots] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLots = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (sourceFilter) params.source_type = sourceFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await inventoryApi.getLots(params);
      if (res && res.data) {
        setLots(res.data.lots || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load inventory lots', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, statusFilter, addToast]);

  useEffect(() => {
    fetchLots(1);
  }, [fetchLots]);

  const columns = [
    {
      key: 'lot_number',
      header: 'Lot Number',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            onClick={() => onNavigate(`/inventory/lots/${row.id}`)}
            style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {val}
          </span>
          <AuditTooltip model="InventoryLot" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'item',
      header: 'Item',
      render: (val) => (
        <div>
          <div style={{ fontWeight: '600' }}>{val?.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val?.item_code}</div>
        </div>
      )
    },
    {
      key: 'source_type',
      header: 'Channel Source',
      render: (val) => <SourceBadge source={val} />
    },
    {
      key: 'received_date',
      header: 'Received Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'available_quantity',
      header: 'Available / Original',
      render: (val, row) => (
        <div>
          <span style={{ fontWeight: '800', color: parseFloat(val) > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
            {val}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {' '}/ {row.original_quantity} {row.item?.unit}
          </span>
        </div>
      )
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      render: (val, row) => `${formatCurrency(val)} / ${row.item?.unit}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      header: 'Trace',
      align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => onNavigate(`/inventory/lots/${row.id}`)}>
          Drill Down →
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Unified Inventory Lots</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Traceable inventory batches governed by FIFO cost accounting
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/inventory')}>
          ← Back to Stock Overview
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search by lot number or item..." />

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Sources</option>
          <option value="PURCHASE">Purchased Goods</option>
          <option value="HARVEST">Farm Produced</option>
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
            fontSize: '13px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="DEPLETED">Depleted</option>
          <option value="REVERSED">Reversed</option>
        </select>
      </div>

      <DataTable columns={columns} data={lots} loading={loading} emptyMessage="No inventory lots found." />
      <Pagination pagination={pagination} onPageChange={fetchLots} />
    </div>
  );
};
