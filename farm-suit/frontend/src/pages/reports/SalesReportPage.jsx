import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../../api/reports';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const SalesReportPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState('0.00');
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

      const res = await reportsApi.getSales(params);
      if (res && res.data) {
        setSales(res.data.sales || []);
        setTotalRevenue(res.data.total_revenue || '0.00');
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load sales report', 'error');
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
      header: 'Invoice No.',
      render: (val, row) => (
        <span
          onClick={() => onNavigate(`/sales/${row.id}`)}
          style={{ fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {val}
        </span>
      )
    },
    { key: 'customer', header: 'Customer', render: (val) => <b>{val}</b> },
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Sales Revenue Report</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Comprehensive billing ledger across customers and periods
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
            Total Period Revenue
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
            {formatCurrency(totalRevenue)}
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

      <DataTable columns={columns} data={sales} loading={loading} emptyMessage="No sales recorded for this period." />
      <Pagination pagination={pagination} onPageChange={fetchReport} />
    </div>
  );
};
