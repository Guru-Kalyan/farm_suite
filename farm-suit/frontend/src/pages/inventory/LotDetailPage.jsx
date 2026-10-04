import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventory';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SourceBadge } from '../../components/common/SourceBadge';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const LotDetailPage = ({ id, onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLot = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getLot(id);
      if (res && res.data) {
        setLot(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load lot details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchLot();
  }, [fetchLot]);

  if (loading || !lot) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading inventory lot lifecycle drilldown...
      </div>
    );
  }

  const consumedQty = (parseFloat(lot.original_quantity) - parseFloat(lot.available_quantity)).toFixed(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'monospace' }}>Lot: {lot.lot_number}</h1>
            <SourceBadge source={lot.source_type} />
            <StatusBadge status={lot.status} />
            <AuditTooltip model="InventoryLot" id={lot.id} onOpenTimeline={onOpenAudit} />
          </div>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Item: <b>{lot.item?.name}</b> [{lot.item?.item_code}] • Received: {formatDate(lot.received_date)}
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/inventory/lots')}>
          ← Back to Lots List
        </Button>
      </div>

      {/* Lot KPI Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Stock</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {lot.available_quantity} {lot.item?.unit}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Original: {lot.original_quantity} {lot.item?.unit}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unit Acquisition Cost</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {formatCurrency(lot.unit_cost)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Per {lot.item?.unit}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stock Consumed via Sales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)', marginTop: '4px' }}>
            {consumedQty} {lot.item?.unit}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{lot.sales_consuming_lot?.length || 0} sales transactions</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Origin Document</div>
          {lot.source_type === 'PURCHASE' ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                   onClick={() => onNavigate(`/purchases/${lot.source_info?.bill_id}`)}>
                {lot.source_info?.bill_number}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Vendor: {lot.source_info?.vendor_name}</div>
            </div>
          ) : (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: '700' }}>{lot.source_info?.harvest_number}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Batch: {lot.source_info?.batch_number} ({lot.source_info?.farm_plot})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complete Movement Ledger */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Stock Movement Ledger</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Movement Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Reference Document</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Created By</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(lot.movements || []).map((m, idx) => (
                <tr key={m.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>{formatDateTime(m.movement_date)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontWeight: '700',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: m.movement_type === 'RECEIPT' ? 'var(--success-subtle)' :
                                       m.movement_type === 'SALE' ? 'var(--info-subtle)' : 'var(--danger-subtle)',
                      color: m.movement_type === 'RECEIPT' ? 'var(--success-text)' :
                             m.movement_type === 'SALE' ? 'var(--info-text)' : 'var(--danger-text)'
                    }}>
                      {m.movement_type}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {m.movement_type === 'SALE' ? `-${m.quantity}` : `+${m.quantity}`} {lot.item?.unit}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{m.reference_type} #{m.reference_id}</td>
                  <td style={{ padding: '8px 12px' }}>{m.created_by}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{m.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Invoices Consuming This Lot */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Sales Invoices Consuming This Lot (FIFO Allocation)</h3>
        {(!lot.sales_consuming_lot || lot.sales_consuming_lot.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            This lot has not yet been consumed by any customer sales bills.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Sales Bill</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty Consumed</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Selling Rate</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>COGS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross Profit</th>
                </tr>
              </thead>
              <tbody>
                {lot.sales_consuming_lot.map((s, idx) => (
                  <tr key={s.sales_line_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        onClick={() => onNavigate(`/sales/${s.bill_id}`)}
                        style={{ fontWeight: '700', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {s.bill_number}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{s.customer}</td>
                    <td style={{ padding: '8px 12px' }}>{formatDate(s.bill_date)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {s.quantity} {lot.item?.unit}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(s.selling_rate)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(s.revenue)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(s.cogs)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                      {formatCurrency(s.gross_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
