import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PaymentsReceivedPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [totalAmount, setTotalAmount] = useState('0.00');
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
      }
    }).catch(() => {});
  }, []);

  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (customerId) params.customer_id = customerId;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await salesApi.getPayments(params);
      if (res && res.data) {
        setPayments(res.data.payments || []);
        setTotalAmount(res.data.total_amount || '0.00');
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load payments received', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, customerId, paymentMethod, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleClearFilters = () => {
    setSearch('');
    setCustomerId('');
    setPaymentMethod('');
    setFromDate('');
    setToDate('');
  };

  const columns = [
    {
      key: 'payment_date',
      header: 'Payment Date',
      render: (val) => formatDate(val)
    },
    {
      key: 'sales_bill',
      header: 'Related Invoice',
      render: (val) => (
        <div>
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{val?.bill_number}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
            Total: {formatCurrency(val?.grand_total)}
          </span>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (val) => (
        <div>
          <span style={{ fontWeight: '600' }}>{val?.customer_name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{val?.customer_code}</span>
        </div>
      )
    },
    {
      key: 'payment_method_display',
      header: 'Payment Method',
      render: (val) => <span style={{ fontWeight: '600' }}>{val}</span>
    },
    {
      key: 'reference_number',
      header: 'Reference / UTR',
      render: (val) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{val || '—'}</span>
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val || '—'}</span>
    },
    {
      key: 'recorded_by',
      header: 'Recorded By',
      render: (val) => <span style={{ color: 'var(--text-muted)' }}>{val || 'Admin'}</span>
    },
    {
      key: 'amount',
      header: 'Amount Received',
      align: 'right',
      render: (val) => <span style={{ fontWeight: '800', color: 'var(--success-text)' }}>{formatCurrency(val)}</span>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Customer Payments Received</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Audit trail of all partial and full payments collected from customers
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/sales')}>
          ← Back to Sales History
        </Button>
      </div>

      {/* Summary KPI Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
            Total Collections (Filtered Period)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: 'var(--success-text)' }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by invoice, customer, or UTR..."
          />
        </div>

        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '12.5px'
          }}
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.customer_name}</option>
          ))}
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '12.5px'
          }}
        >
          <option value="">All Methods</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CASH">Cash</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>

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
            fontSize: '12px'
          }}
        />

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
            fontSize: '12px'
          }}
        />

        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          Clear
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        onRowClick={(row) => onNavigate(`/sales/${row.sales_bill?.id}`)}
        emptyMessage="No payment transactions found."
      />

      <Pagination pagination={pagination} onPageChange={fetchPayments} />
    </div>
  );
};
