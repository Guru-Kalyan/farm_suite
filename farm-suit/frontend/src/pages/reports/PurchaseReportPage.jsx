import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../../api/reports';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseReportPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [totalExpenditure, setTotalExpenditure] = useState('0.00');
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReport = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await reportsApi.getPurchases(params);
      if (res && res.data) {
        setPurchases(res.data.purchases || []);
        setTotalExpenditure(res.data.total_expenditure || '0.00');
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load purchase report', 'error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, addToast]);

  useEffect(() => {
    fetchReport(1);
  }, [fetchReport]);

  const columns = [
    {
      key: 'bill_number',
      header: 'Bill No.',
      render: (val, row) => (
        <span
          onClick={() => onNavigate(`/purchases/${row.id}`)}
          style={{ fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {val}
        </span>
      )
    },
    { key: 'vendor', header: 'Vendor Supplier', render: (val) => <b>{val}</b> },
    { key: 'bill_date', header: 'Date', render: (val) => formatDate(val) },
    { key: 'subtotal', header: 'Subtotal', render: (val) => formatCurrency(val) },
    { key: 'tax', header: 'Tax', render: (val) => formatCurrency(val) },
    { key: 'discount', header: 'Discount', render: (val) => formatCurrency(val) },
    { key: 'grand_total', header: 'Grand Total', render: (val) => <span style={{ fontWeight: '800' }}>{formatCurrency(val)}</span> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Purchases & Procurement Report</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            External vendor acquisition expenses and volumes
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
            Total Procurement Spend
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {formatCurrency(totalExpenditure)}
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
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <Button variant="secondary" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
          Reset
        </Button>
      </div>

      <DataTable columns={columns} data={purchases} loading={loading} emptyMessage="No purchases recorded for this period." />
      <Pagination pagination={pagination} onPageChange={fetchReport} />
    </div>
  );
};
