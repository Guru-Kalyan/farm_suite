import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventory';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const StockOverviewPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [totalValuation, setTotalValuation] = useState('0.00');
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const fetchOverview = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (lowStockOnly) params.low_stock = 'true';

      const res = await inventoryApi.getOverview(params);
      if (res && res.data) {
        setInventory(res.data.inventory || []);
        setTotalValuation(res.data.total_valuation || '0.00');
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load stock overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly, addToast]);

  useEffect(() => {
    fetchOverview(1);
  }, [fetchOverview]);

  const columns = [
    {
      key: 'item_name',
      header: 'Item / Crop',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '700' }}>{val}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.item_code} • {row.category}</div>
        </div>
      )
    },
    {
      key: 'available_stock',
      header: 'Total Available Stock',
      render: (val, row) => (
        <div>
          <span style={{
            fontSize: '14px',
            fontWeight: '800',
            color: row.is_low_stock ? 'var(--danger)' : 'var(--primary)'
          }}>
            {val} {row.unit}
          </span>
          {row.is_low_stock && (
            <span style={{
              marginLeft: '6px',
              fontSize: '10.5px',
              color: 'var(--danger)',
              backgroundColor: 'var(--danger-subtle)',
              padding: '1px 6px',
              borderRadius: '4px'
            }}>
              Low Stock
            </span>
          )}
        </div>
      )
    },
    {
      key: 'purchased_stock',
      header: 'Purchased Stock',
      render: (val, row) => <span style={{ color: 'var(--text-secondary)' }}>{val} {row.unit}</span>
    },
    {
      key: 'harvested_stock',
      header: 'Farm Produced Stock',
      render: (val, row) => <span style={{ color: 'var(--text-secondary)' }}>{val} {row.unit}</span>
    },
    {
      key: 'minimum_stock',
      header: 'Reorder Level',
      render: (val, row) => <span style={{ color: 'var(--text-muted)' }}>{val} {row.unit}</span>
    },
    {
      key: 'valuation',
      header: 'Valuation',
      render: (val) => <span style={{ fontWeight: '700' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'actions',
      header: 'Lots',
      align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => onNavigate(`/inventory/lots?item_id=${row.item_id}`)}>
          Inspect Lots ({row.active_lots_count}) →
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Unified Inventory Overview</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Consolidated stock levels bridging purchased vendor goods and in-house farm harvests
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
            Total Inventory Valuation
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
            {formatCurrency(totalValuation)}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by crop or item code..." />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            Show Low Stock Only
          </label>
        </div>
      </div>

      <DataTable columns={columns} data={inventory} loading={loading} emptyMessage="No stock records found." />
      <Pagination pagination={pagination} onPageChange={fetchOverview} />
    </div>
  );
};
