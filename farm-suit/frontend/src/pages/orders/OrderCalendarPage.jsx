import React, { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../../api/orders';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const OrderCalendarPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getCalendar();
      if (res && res.data) {
        setCalendar(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load delivery calendar', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const renderOrderCard = (order) => (
    <div
      key={order.id}
      onClick={() => onNavigate(`/orders/${order.id}`)}
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)', fontSize: '13px' }}>
            {order.order_number}
          </span>
          <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '2px' }}>
            {order.customer?.name}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
        <b>Delivery:</b> {formatDate(order.requested_delivery_date)}
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Items: {(order.lines || []).map(l => `${l.quantity} ${l.item?.unit?.short_name || ''} ${l.item?.name}`).join(', ')}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '8px',
        marginTop: '4px',
        fontSize: '12px'
      }}>
        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
          {formatCurrency(order.estimated_total)}
        </span>
        <span style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10.5px',
          fontWeight: '700',
          backgroundColor: order.order_type === 'ADVANCE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          color: order.order_type === 'ADVANCE' ? 'var(--success)' : 'var(--primary)'
        }}>
          {order.order_type}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Delivery Planning Calendar</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Operational delivery planning, upcoming customer commitments, and fulfillment dispatch schedule
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => onNavigate('/orders/regular')}>
            ← Regular Orders
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('/orders/advance')}>
            Advance Orders →
          </Button>
          <Button variant="primary" onClick={() => onNavigate('/orders/create')}>
            + Book Order
          </Button>
        </div>
      </div>

      {loading || !calendar ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading delivery schedules and dispatch commitments...
        </div>
      ) : (
        <>
          {/* Metrics */}
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
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase' }}>
                ⚠️ Overdue Deliveries
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                {calendar.overdue?.length || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Require immediate attention
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
                🚚 Today's Deliveries
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                {calendar.today?.length || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Scheduled for dispatch today
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
                📦 Tomorrow's Deliveries
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {calendar.tomorrow?.length || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                To be prepared in advance
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
                📅 Upcoming (Next 7 Days)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {calendar.upcoming_week?.length || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Medium-term delivery commitments
              </div>
            </div>
          </div>

          {/* Delivery Columns / Swimlanes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            {/* Overdue */}
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--danger)' }}>⚠️ Overdue</h3>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>
                  {calendar.overdue?.length || 0}
                </span>
              </div>
              {calendar.overdue && calendar.overdue.length > 0 ? (
                calendar.overdue.map(renderOrderCard)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No overdue orders!
                </div>
              )}
            </div>

            {/* Today */}
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--primary)' }}>🚚 Today</h3>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                  {calendar.today?.length || 0}
                </span>
              </div>
              {calendar.today && calendar.today.length > 0 ? (
                calendar.today.map(renderOrderCard)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No deliveries scheduled for today.
                </div>
              )}
            </div>

            {/* Tomorrow */}
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📦 Tomorrow</h3>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>
                  {calendar.tomorrow?.length || 0}
                </span>
              </div>
              {calendar.tomorrow && calendar.tomorrow.length > 0 ? (
                calendar.tomorrow.map(renderOrderCard)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No deliveries tomorrow.
                </div>
              )}
            </div>

            {/* Upcoming Week */}
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📅 Next 7 Days</h3>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>
                  {calendar.upcoming_week?.length || 0}
                </span>
              </div>
              {calendar.upcoming_week && calendar.upcoming_week.length > 0 ? (
                calendar.upcoming_week.map(renderOrderCard)
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No upcoming deliveries in the next 7 days.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
