import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../api/reports';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SourceBadge } from '../../components/common/SourceBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const InventoryReportPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [data, setData] = useState({ lots: [], total_quantity: '0', total_valuation: '0' });
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (sourceFilter) params.source_type = sourceFilter;
      const res = await reportsApi.getInventory(params);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load inventory valuation report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [sourceFilter]);

  const columns = [
    {
      key: 'lot_number',
      header: 'Lot Number',
      render: (val, row) => (
        <span
          onClick={() => onNavigate(`/inventory/lots/${row.id}`)}
          style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {val}
        </span>
      )
    },
    { key: 'item_name', header: 'Item Name', render: (val) => <b>{val}</b> },
    { key: 'category', header: 'Category' },
    { key: 'source_type', header: 'Channel', render: (val) => <SourceBadge source={val} /> },
    { key: 'received_date', header: 'Received Date', render: (val) => formatDate(val) },
    { key: 'available_quantity', header: 'Quantity in Stock', render: (val, row) => `${val} ${row.unit}` },
    { key: 'unit_cost', header: 'Unit Cost', render: (val, row) => `${formatCurrency(val)} / ${row.unit}` },
    { key: 'total_valuation', header: 'Asset Valuation', render: (val) => <span style={{ fontWeight: '700' }}>{formatCurrency(val)}</span> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Inventory Valuation Report</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Balance sheet inventory asset valuation across purchased and cultivated stocks
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
            Total Asset Valuation
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
            {formatCurrency(data.total_valuation)}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
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
          <option value="">All Inventory Sources</option>
          <option value="PURCHASE">Purchased Goods Only</option>
          <option value="HARVEST">Farm Produced Only</option>
        </select>
      </div>

      <DataTable columns={columns} data={data.lots} loading={loading} emptyMessage="No active inventory lots found." />
    </div>
  );
};
