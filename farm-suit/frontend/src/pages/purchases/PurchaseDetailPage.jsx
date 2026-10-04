import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseDetailPage = ({ id, onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [confirmReverseOpen, setConfirmReverseOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchasesApi.getPurchase(id);
      if (res && res.data) {
        setBill(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load purchase bill', 'error');
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
      await purchasesApi.postPurchase(bill.id);
      addToast(`Purchase Bill ${bill.bill_number} posted! Inventory received.`, 'success');
      setConfirmPostOpen(false);
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to post purchase bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async (reason) => {
    try {
      setActionLoading(true);
      await purchasesApi.reversePurchase(bill.id, reason);
      addToast(`Purchase Bill ${bill.bill_number} reversed. Inventory adjusted.`, 'success');
      setConfirmReverseOpen(false);
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to reverse purchase bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !bill) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading purchase bill details...
      </div>
    );
  }

  const isDraft = bill.status === 'DRAFT';
  const isPosted = bill.status === 'POSTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Purchase Bill: {bill.bill_number}</h1>
            <StatusBadge status={bill.status} />
            <AuditTooltip model="PurchaseBill" id={bill.id} onOpenTimeline={onOpenAudit} />
          </div>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Vendor: <b>{bill.vendor?.vendor_name}</b> • Bill Date: {formatDate(bill.bill_date)} • Received: {formatDate(bill.received_date)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => onNavigate('/purchases')}>
            ← Back to List
          </Button>

          {isDraft && (
            <Button variant="primary" onClick={() => setConfirmPostOpen(true)}>
              ✅ Post & Receive Stock
            </Button>
          )}

          {isPosted && (
            <Button variant="danger" onClick={() => setConfirmReverseOpen(true)}>
              ↩️ Reverse Bill
            </Button>
          )}
        </div>
      </div>

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
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor Details</div>
          <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '4px' }}>{bill.vendor?.vendor_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Code: {bill.vendor?.vendor_code}</div>
          {bill.vendor?.phone && <div style={{ fontSize: '12px' }}>Phone: {bill.vendor.phone}</div>}
          {bill.vendor?.gst_number && <div style={{ fontSize: '12px' }}>GSTIN: {bill.vendor.gst_number}</div>}
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bill Logistics</div>
          <div style={{ fontSize: '12.5px', marginTop: '4px' }}><b>Bill Date:</b> {formatDate(bill.bill_date)}</div>
          <div style={{ fontSize: '12.5px' }}><b>Received Date:</b> {formatDate(bill.received_date)}</div>
          <div style={{ fontSize: '12.5px' }}><b>Accepted By:</b> {bill.accepted_by || 'Admin'}</div>
          {bill.remarks && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Remarks: {bill.remarks}</div>}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financial Summary</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Subtotal: {formatCurrency(bill.subtotal)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Discount: - {formatCurrency(bill.discount)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tax: {formatCurrency(bill.tax_amount)}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(bill.grand_total)}
          </div>
        </div>
      </div>

      {/* Procured Items & Generated Lots */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Items & Stock Lots Generated</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Inventory Lot Generated</th>
              </tr>
            </thead>
            <tbody>
              {(bill.lines || []).map((line, idx) => (
                <tr key={line.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <b>{line.item?.name}</b>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>[{line.item?.item_code}]</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {line.quantity} {line.item?.unit}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {formatCurrency(line.unit_rate)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                    {formatCurrency(line.amount)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {line.lots && line.lots.length > 0 ? (
                      line.lots.map(lot => (
                        <div key={lot.lot_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            onClick={() => onNavigate(`/inventory/lots/${lot.lot_id}`)}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {lot.lot_number}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            (Avail: {lot.available_quantity}/{lot.original_quantity})
                          </span>
                          <StatusBadge status={lot.status} />
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11.5px' }}>
                        Not generated (Draft status)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmPostOpen}
        onClose={() => setConfirmPostOpen(false)}
        onConfirm={handlePost}
        title={`Post Purchase Bill ${bill.bill_number}`}
        message="Posting this purchase bill will create official Inventory Lots and increment warehouse stock. Are you ready to receive the goods?"
        confirmText="Confirm & Receive Stock"
        confirmVariant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmReverseOpen}
        onClose={() => setConfirmReverseOpen(false)}
        onConfirm={handleReverse}
        title={`Reverse Purchase Bill ${bill.bill_number}`}
        message="Reversing will void the purchase and remove the inventory lots. (Note: Only unconsumed lots can be reversed)."
        confirmText="Reverse Bill"
        confirmVariant="danger"
        requireReason={true}
        reasonPlaceholder="Mandatory reason for reversal (e.g. Returned goods, invoice cancellation)..."
        loading={actionLoading}
      />
    </div>
  );
};
