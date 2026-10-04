import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BillActions } from '../../components/billing/BillActions';
import { BillPreviewModal } from '../../components/billing/BillPreviewModal';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const SalesDetailPage = ({ id, onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmReverseOpen, setConfirmReverseOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await salesApi.getSale(id);
      if (res && res.data) {
        setBill(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load sales invoice', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePost = async () => {
    try {
      setActionLoading(true);
      const itemsPayload = (bill.lines || []).map(l => ({
        item_id: l.item.id,
        quantity: l.quantity,
        selling_rate: l.selling_rate
      }));
      await salesApi.postSale(bill.id, itemsPayload);
      addToast(`Invoice ${bill.bill_number} posted! FIFO stock consumed.`, 'success');
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to post sales bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async (reason) => {
    try {
      setActionLoading(true);
      await salesApi.reverseSale(bill.id, reason);
      addToast(`Invoice ${bill.bill_number} reversed. Stock restored to inventory.`, 'success');
      setConfirmReverseOpen(false);
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to reverse sales bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !bill) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading invoice details...
      </div>
    );
  }

  const isPosted = bill.status === 'POSTED';
  const marginPct = parseFloat(bill.subtotal || 0) > 0
    ? ((parseFloat(bill.total_gross_profit || 0) / parseFloat(bill.subtotal)) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Invoice: {bill.bill_number}</h1>
            <StatusBadge status={bill.status} />
            <AuditTooltip model="SalesBill" id={bill.id} onOpenTimeline={onOpenAudit} />
          </div>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Customer: <b>{bill.customer?.customer_name}</b> • Date: {formatDate(bill.bill_date)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => onNavigate('/sales')}>
            ← Back to Sales
          </Button>

          <BillActions
            bill={bill}
            onPost={handlePost}
            onReverse={() => setConfirmReverseOpen(true)}
            onPreview={() => setPreviewOpen(true)}
            loading={actionLoading}
          />
        </div>
      </div>

      {/* Financial & Profitability Banner */}
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
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invoice Grand Total</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(bill.grand_total)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subtotal: {formatCurrency(bill.subtotal)}</div>
        </div>

        {isPosted && (
          <>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Historical COGS (Cost)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                {formatCurrency(bill.total_cogs)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Exact FIFO lot costs</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Profit & Margin</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
                {formatCurrency(bill.total_gross_profit)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success-text)' }}>
                {marginPct}% Gross Margin
              </div>
            </div>
          </>
        )}

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer & Status</div>
          <div style={{ fontWeight: '700', fontSize: '13.5px', marginTop: '4px' }}>{bill.customer?.customer_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created by {bill.created_by || 'Admin'}</div>
          {bill.remarks && <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{bill.remarks}</div>}
        </div>
      </div>

      {/* Itemized Lines with FIFO Cost Breakdown */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>
          Line Items & FIFO Lot Consumption
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Consumed Lot & Source</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Selling Rate</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>COGS</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {(bill.lines || []).map((line, idx) => (
                <tr key={line.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <b>{line.item?.name}</b>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>[{line.item?.item_code}]</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {line.lot ? (
                      <div>
                        <span
                          onClick={() => onNavigate(`/inventory/lots/${line.lot.id}`)}
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {line.lot.lot_number}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                          ({line.lot.source_type} @ {formatCurrency(line.lot.lot_unit_cost)})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending posting</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                    {line.quantity} {line.item?.unit}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {formatCurrency(line.selling_rate)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {formatCurrency(line.revenue)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {formatCurrency(line.cost_of_goods_sold)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                    {formatCurrency(line.gross_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Preview Modal */}
      <BillPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        bill={bill}
      />

      {/* Reversal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmReverseOpen}
        onClose={() => setConfirmReverseOpen(false)}
        onConfirm={handleReverse}
        title={`Reverse Invoice ${bill.bill_number}`}
        message="Reversing will void this sales invoice and restore the consumed quantities back to their respective inventory lots."
        confirmText="Confirm Reversal"
        confirmVariant="danger"
        requireReason={true}
        reasonPlaceholder="Mandatory reason for reversal (e.g. Order cancelled, billing correction)..."
        loading={actionLoading}
      />
    </div>
  );
};
