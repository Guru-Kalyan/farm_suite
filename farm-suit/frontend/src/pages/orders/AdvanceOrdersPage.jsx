import React, { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../../api/orders';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const AdvanceOrdersPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  // Filters
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
      }
    }).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { order_type: 'ADVANCE' };
      if (customerId) params.customer_id = customerId;
      if (status) params.status = status;
      if (fromDate) params.delivery_date_after = fromDate;
      if (toDate) params.delivery_date_before = toDate;
      if (search) params.search = search;

      const res = await ordersApi.getOrders(params);
      if (res && res.data) {
        setOrders(res.data.orders || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load advance orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerId, status, fromDate, toDate, search, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClearFilters = () => {
    setCustomerId('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Advance Orders</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Future commitments with scheduled delivery and advance token receipts, credited automatically upon fulfillment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onNavigate('/orders/calendar')}>
            📅 Delivery Calendar
          </Button>
          <Button variant="primary" onClick={() => onNavigate('/orders/create?type=ADVANCE')}>
            + Book Advance Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Advance Bookings
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
              {summary.total_orders || orders.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Expected: {formatCurrency(summary.total_estimated_amount)}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Advances Received
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
              {formatCurrency(summary.total_advance_received)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Held as customer credits
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Remaining Expected Balance
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>
              {formatCurrency(summary.total_remaining_balance)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              To collect on delivery
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'flex-end'
      }}>
        <div style={{ minWidth: '180px', flex: 1 }}>
          <Input
            label="Search Order #"
            placeholder="Search order number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <Select
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.code || ''})` }))
            ]}
          />
        </div>

        <div style={{ minWidth: '150px' }}>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'IN_PREPARATION', label: 'In Preparation' },
              { value: 'READY', label: 'Ready' },
              { value: 'DISPATCHED', label: 'Dispatched' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
          />
        </div>

        <div style={{ minWidth: '130px' }}>
          <Input
            label="Delivery From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '130px' }}>
          <Input
            label="Delivery To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <Button variant="ghost" onClick={handleClearFilters}>
          Clear
        </Button>
      </div>

      {/* Orders Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading advance orders...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No advance orders found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Order Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Delivery Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Est. Total (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Advance Paid (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Remaining Balance (₹)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Linked Bill</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const rem = parseFloat(o.remaining_balance || 0);

                  return (
                    <tr
                      key={o.id}
                      onClick={() => onNavigate(`/orders/${o.id}`)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
                        {o.order_number}
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          padding: '2px 6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success)',
                          borderRadius: '4px'
                        }}>
                          ADVANCE
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <b>{o.customer?.name}</b>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.customer?.phone}</div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                        {formatDate(o.requested_delivery_date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>
                        {formatCurrency(o.estimated_total)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--success)', fontWeight: '700' }}>
                        {formatCurrency(o.advance_amount_received)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: rem > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        {formatCurrency(rem)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        {o.linked_sale_bill ? (
                          <span
                            onClick={() => onNavigate(`/sales/${o.linked_sale_bill.id}`)}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {o.linked_sale_bill.bill_number}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not fulfilled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => onNavigate(`/orders/${o.id}`)}>
                          Manage →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
