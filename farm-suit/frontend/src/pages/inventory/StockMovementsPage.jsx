import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventory';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const StockMovementsPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');

  const fetchMovements = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (movementType) params.movement_type = movementType;

      const res = await inventoryApi.getMovements(params);
      if (res && res.data) {
        setMovements(res.data.movements || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load stock movements', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, movementType, addToast]);

  useEffect(() => {
    fetchMovements(1);
  }, [fetchMovements]);

  const columns = [
    {
      key: 'movement_date',
      header: 'Timestamp',
      render: (val) => formatDateTime(val)
    },
    {
      key: 'lot_number',
      header: 'Lot Number',
      render: (val, row) => (
        <span
          onClick={() => onNavigate(`/inventory/lots/${row.reference_id}`)}
          style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {val}
        </span>
      )
    },
    {
      key: 'item_name',
      header: 'Item',
      render: (val, row) => <b>{val}</b>
    },
    {
      key: 'movement_type',
      header: 'Type',
      render: (val) => (
        <span style={{
          fontWeight: '700',
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: val === 'RECEIPT' ? 'var(--success-subtle)' :
                           val === 'SALE' ? 'var(--info-subtle)' : 'var(--danger-subtle)',
          color: val === 'RECEIPT' ? 'var(--success-text)' :
                 val === 'SALE' ? 'var(--info-text)' : 'var(--danger-text)'
        }}>
          {val}
        </span>
      )
    },
    {
      key: 'quantity',
      header: 'Magnitude',
      render: (val, row) => (
        <span style={{ fontWeight: '700', color: row.movement_type === 'SALE' ? 'var(--danger)' : 'var(--success)' }}>
          {row.movement_type === 'SALE' ? `-${val}` : `+${val}`} {row.unit}
        </span>
      )
    },
    {
      key: 'reference_type',
      header: 'Document Reference',
      render: (val, row) => `${val} #${row.reference_id}`
    },
    {
      key: 'created_by',
      header: 'Recorded By',
      render: (val) => val || 'System'
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (val) => <span style={{ color: 'var(--text-muted)' }}>{val || '—'}</span>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Global Stock Movement Ledger</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Complete immutable audit log of receipts, sales consumptions, reversals, and adjustments
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search by lot, crop, or reference..." />

        <select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Movement Types</option>
          <option value="RECEIPT">Stock Receipts</option>
          <option value="SALE">Sale Consumptions</option>
          <option value="REVERSAL">Reversals</option>
          <option value="ADJUSTMENT_IN">Adjustment In</option>
          <option value="ADJUSTMENT_OUT">Adjustment Out</option>
        </select>
      </div>

      <DataTable columns={columns} data={movements} loading={loading} emptyMessage="No stock movements recorded." />
      <Pagination pagination={pagination} onPageChange={fetchMovements} />
    </div>
  );
};
