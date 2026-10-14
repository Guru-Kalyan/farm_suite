import React, { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../../api/orders';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { RecordPaymentModal } from '../../components/billing/RecordPaymentModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const OrderDetailPage = ({ id, onNavigate }) => {
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [confirmFulfillOpen, setConfirmFulfillOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getOrder(id);
      if (res && res.data) {
        setOrder(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load order', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      await ordersApi.updateStatus(order.id, newStatus);
      addToast(`Order status updated to ${newStatus}`, 'success');
      fetchOrder();
    } catch (err) {
      addToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordAdvance = async (payload) => {
    try {
      await ordersApi.recordAdvance(order.id, payload);
      addToast('Advance payment recorded successfully', 'success');
      fetchOrder();
    } catch (err) {
      addToast(err.message || 'Failed to record advance', 'error');
      throw err;
    }
  };

  const handleFulfill = async () => {
    try {
      setActionLoading(true);
      const res = await ordersApi.fulfillOrder(order.id, true);
      addToast(`Order fulfilled into Sales Bill ${res.data.bill_number}!`, 'success');
      setConfirmFulfillOpen(false);
      onNavigate(`/sales/${res.data.id}`);
    } catch (err) {
      addToast(err.message || 'Failed to fulfill order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading order details...
      </div>
    );
  }

  const isFulfilled = Boolean(order.linked_sale_bill);
  const isCancelled = order.status === 'CANCELLED';
  const remainingExpected = parseFloat(order.remaining_balance || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Order: {order.order_number}</h1>
            <StatusBadge status={order.order_type} />
            <StatusBadge status={order.status} />
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Customer: <b>{order.customer?.name}</b> • Booked: {formatDate(order.order_date)} • Delivery: <b>{formatDate(order.requested_delivery_date)}</b>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => onNavigate(order.order_type === 'ADVANCE' ? '/orders/advance' : '/orders/regular')}>
            ← Back to Orders
          </Button>

          {!isCancelled && !isFulfilled && (
            <>
              {remainingExpected > 0 && (
                <Button variant="secondary" onClick={() => setAdvanceModalOpen(true)}>
                  💰 Record Advance
                </Button>
              )}

              <Button variant="primary" onClick={() => setConfirmFulfillOpen(true)}>
                📦 Fulfill into Sale Bill
              </Button>

              <Button variant="danger" size="sm" onClick={() => setConfirmCancelOpen(true)}>
                Cancel Order
              </Button>
            </>
          )}

          {isFulfilled && (
            <Button variant="primary" onClick={() => onNavigate(`/sales/${order.linked_sale_bill.id}`)}>
              View Sales Bill ({order.linked_sale_bill.bill_number}) →
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      {!isCancelled && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Order Lifecycle Progress
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY', 'DISPATCHED', 'DELIVERED'].map((st) => {
              const isCurrent = order.status === st;

              return (
                <button
                  key={st}
                  disabled={actionLoading || isFulfilled}
                  onClick={() => handleStatusChange(st)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-secondary)',
                    color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: isCurrent ? '700' : '500',
                    fontSize: '12px',
                    cursor: isFulfilled ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isCurrent && '✓'} {st.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Information</div>
          <div style={{ fontWeight: '700', fontSize: '15px', marginTop: '4px' }}>{order.customer?.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Code: {order.customer?.code || '—'}</div>
          {order.customer?.phone && <div style={{ fontSize: '12px' }}>Phone: {order.customer.phone}</div>}
          {order.customer?.address && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Address: {order.customer.address}</div>}
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logistics & Delivery</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}><b>Delivery Date:</b> {formatDate(order.requested_delivery_date)}</div>
          <div style={{ fontSize: '13px' }}><b>Booked Date:</b> {formatDate(order.order_date)}</div>
          <div style={{ fontSize: '13px' }}><b>Responsible:</b> {order.assigned_employee || 'Admin'}</div>
          {order.delivery_notes && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Instructions: {order.delivery_notes}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financials</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(order.estimated_total)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>
            Advance Paid: {formatCurrency(order.advance_amount_received)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: remainingExpected > 0 ? 'var(--warning)' : 'var(--success)' }}>
            Remaining Expected: {formatCurrency(remainingExpected)}
          </div>
          {isFulfilled && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '700' }}>
                ✓ Converted to Sale #{order.linked_sale_bill?.bill_number}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Order Line Items */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Requested Products</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Expected Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(order.lines || []).map((line, idx) => (
                <tr key={line.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <b>{line.item?.name}</b>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>[{line.item?.item_code}]</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {line.quantity} {line.item?.unit}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {formatCurrency(line.unit_price)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {formatCurrency(line.amount)}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {line.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance Payments History */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Advance Payments Received</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              These advances will automatically credit the final sales invoice upon fulfillment
            </p>
          </div>
          {!isCancelled && !isFulfilled && remainingExpected > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setAdvanceModalOpen(true)}>
              + Add Advance Payment
            </Button>
          )}
        </div>

        {order.advances && order.advances.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Advance (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Method</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Reference #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Recorded By</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {order.advances.map((a, idx) => (
                  <tr key={a.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>{formatDate(a.payment_date)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                      {formatCurrency(a.amount)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {a.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{a.reference_number || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{a.recorded_by || 'Admin'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No advance payments recorded yet for this order.
          </div>
        )}
      </div>

      {/* Record Advance Modal */}
      <RecordPaymentModal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        onSubmit={handleRecordAdvance}
        billNumber={order.order_number}
        partyName={order.customer?.name}
        balancePayable={remainingExpected}
        title={`Record Advance Payment for ${order.order_number}`}
      />

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmFulfillOpen}
        onClose={() => setConfirmFulfillOpen(false)}
        onConfirm={handleFulfill}
        title={`Fulfill Order ${order.order_number}`}
        message={`This will convert the order into an official Sales Bill, credit ₹${formatCurrency(order.advance_amount_received)} in advances to the bill, and deduct inventory lots via FIFO. Proceed with fulfillment?`}
        confirmText="Confirm & Create Sales Bill"
        confirmVariant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => handleStatusChange('CANCELLED')}
        title={`Cancel Order ${order.order_number}`}
        message="Are you sure you want to cancel this order? Cancelled orders cannot be fulfilled or generate inventory movements."
        confirmText="Yes, Cancel Order"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
