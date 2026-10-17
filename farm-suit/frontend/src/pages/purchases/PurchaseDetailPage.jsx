import React, { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../../api/purchases';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { WhatsAppShareButton } from '../../components/common/WhatsAppShareButton';
import { RecordPaymentModal } from '../../components/billing/RecordPaymentModal';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { generatePurchaseWhatsAppUrl } from '../../utils/whatsappShare';
import { downloadPurchaseBillPdf } from '../../utils/pdfDownload';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseDetailPage = ({ id, onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [confirmReverseOpen, setConfirmReverseOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

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

  const handleRecordPayment = async (payload) => {
    try {
      await purchasesApi.recordPayment(bill.id, payload);
      addToast('Vendor payment recorded successfully', 'success');
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to record vendor payment', 'error');
      throw err;
    }
  };

  const handlePdfDownload = async () => {
    try {
      await downloadPurchaseBillPdf(bill.id, bill.bill_number);
      addToast(`Downloaded PDF for Purchase Bill ${bill.bill_number}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download PDF', 'error');
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
  const balancePayable = parseFloat(bill.balance_payable ?? (parseFloat(bill.grand_total || 0) - parseFloat(bill.amount_paid || 0)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Purchase Bill: {bill.bill_number}</h1>
            <StatusBadge status={bill.status} />
            {bill.payment_status && <StatusBadge status={bill.payment_status} />}
            <AuditTooltip model="PurchaseBill" id={bill.id} onOpenTimeline={onOpenAudit} />
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Vendor: <b>{bill.vendor?.vendor_name}</b> • Bill Date: {formatDate(bill.bill_date)} • Received: {formatDate(bill.received_date)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => onNavigate('/purchases')}>
            ← Back to Purchases
          </Button>

          <Button variant="secondary" onClick={handlePdfDownload} title="Download Purchase Order / Bill PDF">
            📄 Download PDF
          </Button>

          <WhatsAppShareButton
            bill={bill}
            type="purchase"
            variant="button"
            label="Share Bill"
            title="Share Purchase Bill via WhatsApp with PDF"
          />

          {isPosted && balancePayable > 0 && (
            <Button variant="primary" onClick={() => setPaymentModalOpen(true)}>
              💳 Record Payment
            </Button>
          )}

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
          <div style={{ fontWeight: '700', fontSize: '15px', marginTop: '4px' }}>{bill.vendor?.vendor_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Code: {bill.vendor?.vendor_code}</div>
          {bill.vendor?.phone && <div style={{ fontSize: '12px' }}>Phone: {bill.vendor.phone}</div>}
          {bill.vendor?.gst_number && <div style={{ fontSize: '12px' }}>GSTIN: {bill.vendor.gst_number}</div>}
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bill Logistics</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}><b>Bill Date:</b> {formatDate(bill.bill_date)}</div>
          <div style={{ fontSize: '13px' }}><b>Received Date:</b> {formatDate(bill.received_date)}</div>
          <div style={{ fontSize: '13px' }}><b>Accepted By:</b> {bill.accepted_by || 'Admin'}</div>
          {bill.remarks && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Remarks: {bill.remarks}</div>}
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Landed Cost Breakdown</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Base Total: {formatCurrency(bill.subtotal)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+ Transport: {formatCurrency(bill.transport_cost || 0)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+ Packaging: {formatCurrency(bill.packaging_cost || 0)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+ Other Proc.: {formatCurrency(bill.other_procurement_costs || 0)}</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
            Total Landed Cost: {formatCurrency(bill.total_landed_cost || bill.grand_total)}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Summary</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
            {formatCurrency(bill.grand_total)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>
            Paid: {formatCurrency(bill.amount_paid || 0)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: balancePayable > 0 ? 'var(--danger)' : 'var(--success)' }}>
            Balance Payable: {formatCurrency(balancePayable)}
          </div>
          <div style={{ marginTop: '4px' }}>
            <StatusBadge status={bill.payment_status || 'UNPAID'} />
          </div>
        </div>
      </div>

      {/* Procured Items & Landed Costs */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Items & Landed Inventory Valuation</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Base Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Base Amount (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Alloc. Costs (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Landed Unit Cost (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Inventory Lot</th>
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
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                    {formatCurrency(line.amount)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    +{formatCurrency(line.allocated_procurement_cost || 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>
                    {formatCurrency(line.landed_unit_cost || line.unit_rate)}
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
                            ({lot.available_quantity}/{lot.original_quantity} @ {formatCurrency(lot.unit_cost)}/unit)
                          </span>
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

      {/* Vendor Payment History */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Vendor Payment History</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              All partial and full payments disbursed to {bill.vendor?.vendor_name}
            </p>
          </div>
          {isPosted && balancePayable > 0 && (
            <Button variant="primary" size="sm" onClick={() => setPaymentModalOpen(true)}>
              + Record Payment
            </Button>
          )}
        </div>

        {bill.payments && bill.payments.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount Paid (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Method</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Reference #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Recorded By</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((p, idx) => (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>{formatDate(p.payment_date)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.reference_number || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{p.recorded_by || 'Admin'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No payments recorded yet for this purchase bill.
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSubmit={handleRecordPayment}
        billNumber={bill.bill_number}
        partyName={bill.vendor?.vendor_name}
        balancePayable={balancePayable}
        title={`Record Payment to ${bill.vendor?.vendor_name}`}
      />

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmPostOpen}
        onClose={() => setConfirmPostOpen(false)}
        onConfirm={handlePost}
        title={`Post Purchase Bill ${bill.bill_number}`}
        message="Posting this purchase bill will create official Inventory Lots with allocated landed cost and increment warehouse stock. Are you ready to receive the goods?"
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

