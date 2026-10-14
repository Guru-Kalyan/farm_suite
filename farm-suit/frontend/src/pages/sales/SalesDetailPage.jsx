import React, { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../../api/sales';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { WhatsAppShareButton } from '../../components/common/WhatsAppShareButton';
import { RecordPaymentModal } from '../../components/billing/RecordPaymentModal';
import { downloadSalesBillPdf } from '../../utils/pdfDownload';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const SalesDetailPage = ({ id, onNavigate, onOpenAudit }) => {
  const { addToast } = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmReverseOpen, setConfirmReverseOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

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

  const handleDownload = async () => {
    try {
      addToast('Downloading PDF invoice...', 'info');
      await downloadSalesBillPdf(bill.id, bill.bill_number);
      addToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  const handleRecordPayment = async (payload) => {
    try {
      setSubmittingPayment(true);
      await salesApi.recordPayment(bill.id, payload);
      addToast(`Payment of ${formatCurrency(payload.amount)} recorded successfully!`, 'success');
      setPaymentModalOpen(false);
      fetchDetail();
    } catch (err) {
      addToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !bill) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading invoice details...
      </div>
    );
  }

  const isDraft = bill.status === 'DRAFT';
  const isPosted = bill.status === 'POSTED';
  const isTrade = bill.sale_type === 'TRADE';
  const remaining = parseFloat(bill.remaining_balance || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Invoice: {bill.bill_number}</h1>
            <StatusBadge status={bill.status} />
            <StatusBadge status={bill.payment_status} />
            <StatusBadge status={bill.sale_type} />
            <AuditTooltip model="SalesBill" id={bill.id} onOpenTimeline={onOpenAudit} />
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Customer: <b>{bill.customer?.customer_name}</b> ({bill.customer?.customer_code}) • Date: {formatDate(bill.bill_date)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => onNavigate('/sales')}>
            ← Back to List
          </Button>

          {/* WhatsApp Share Button */}
          <WhatsAppShareButton bill={bill} type={isTrade ? 'trade_sale' : 'sales'} variant="button" />

          {/* Download PDF Button */}
          <Button variant="ghost" onClick={handleDownload} title="Download official PDF invoice">
            📥 Download PDF
          </Button>

          {/* Record Payment Button */}
          {remaining > 0 && bill.status !== 'CANCELLED' && bill.status !== 'REVERSED' && (
            <Button variant="primary" onClick={() => setPaymentModalOpen(true)}>
              💳 Record Payment
            </Button>
          )}

          {isDraft && (
            <Button variant="primary" onClick={handlePost} disabled={actionLoading}>
              ✅ Post & Deduct Stock
            </Button>
          )}

          {isPosted && (
            <Button variant="danger" onClick={() => setConfirmReverseOpen(true)} disabled={actionLoading}>
              ↩ Reverse Bill
            </Button>
          )}
        </div>
      </div>

      {/* Financial Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
            Total Invoice Amount
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)' }}>
            {formatCurrency(bill.grand_total)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Subtotal: {formatCurrency(bill.subtotal)}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
            Amount Received
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px', color: 'var(--success-text)' }}>
            {formatCurrency(bill.amount_paid)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {bill.payments?.length || 0} payment transaction(s)
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
            Remaining Balance
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px', color: remaining > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
            {formatCurrency(bill.remaining_balance)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Status: <b>{bill.payment_status}</b>
          </div>
        </div>

        {isTrade && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Net Trade Profit
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '4px', color: parseFloat(bill.net_trade_profit || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatCurrency(bill.net_trade_profit)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Margin: <b>{bill.trade_margin_pct}%</b>
            </div>
          </div>
        )}
      </div>

      {/* Customer & Bill Information Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Customer Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div><b>Name:</b> {bill.customer?.customer_name}</div>
            <div><b>Code:</b> {bill.customer?.customer_code}</div>
            <div><b>Phone:</b> {bill.customer?.phone || 'N/A'}</div>
            <div><b>GSTIN:</b> {bill.customer?.gst_number || 'N/A'}</div>
            <div><b>Address:</b> {bill.customer?.address || 'N/A'}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Bill & Cost Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Base Subtotal:</span>
              <b>{formatCurrency(bill.subtotal)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax Amount:</span>
              <span>{formatCurrency(bill.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount:</span>
              <span>{formatCurrency(bill.discount)}</span>
            </div>
            {isTrade && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Selling Transport:</span>
                  <span>{formatCurrency(bill.transport_cost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Selling Packaging:</span>
                  <span>{formatCurrency(bill.packaging_cost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Other Selling Expenses:</span>
                  <span>{formatCurrency(bill.other_selling_expenses)}</span>
                </div>
              </>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ fontWeight: '700' }}>Grand Total:</span>
              <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{formatCurrency(bill.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '18px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Line Items & FIFO Cost Deduction</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 10px' }}>#</th>
                <th style={{ padding: '8px 10px' }}>Item</th>
                <th style={{ padding: '8px 10px' }}>Inventory Lot</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>COGS</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {(bill.lines || []).map((line, idx) => (
                <tr key={line.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{line.item?.name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{line.lot?.lot_number || '—'}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      Lot Unit Cost: {formatCurrency(line.lot?.lot_unit_cost || 0)}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{line.quantity} {line.item?.unit}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(line.selling_rate)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(line.revenue)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(line.cost_of_goods_sold)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: parseFloat(line.gross_profit) >= 0 ? '#15803d' : '#b91c1c' }}>
                    {formatCurrency(line.gross_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multiple Partial Payments History (Section 4.3) */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '18px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Recorded Payments History</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Individual payment receipts credited against Invoice {bill.bill_number}
            </p>
          </div>
          {remaining > 0 && bill.status !== 'CANCELLED' && bill.status !== 'REVERSED' && (
            <Button variant="primary" size="sm" onClick={() => setPaymentModalOpen(true)}>
              + Record Payment
            </Button>
          )}
        </div>

        {(!bill.payments || bill.payments.length === 0) ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px'
          }}>
            No payments have been recorded against this invoice yet. Outstanding: {formatCurrency(bill.remaining_balance)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 10px' }}>Payment Date</th>
                  <th style={{ padding: '8px 10px' }}>Method</th>
                  <th style={{ padding: '8px 10px' }}>Reference / UTR</th>
                  <th style={{ padding: '8px 10px' }}>Notes</th>
                  <th style={{ padding: '8px 10px' }}>Recorded By</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((p, idx) => (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px' }}>{formatDate(p.payment_date)}</td>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{p.payment_method_display || p.payment_method}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{p.reference_number || '—'}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{p.notes || '—'}</td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{p.recorded_by || 'Admin'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'var(--success-text)' }}>
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        bill={bill}
        type="sales"
        onSubmit={handleRecordPayment}
        loading={submittingPayment}
      />

      {/* Reversal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmReverseOpen}
        title={`Reverse Sales Bill ${bill.bill_number}`}
        message="Reversing will restore consumed inventory lots back to stock. This cannot be undone if payments exist."
        confirmText="Confirm Reversal"
        cancelText="Cancel"
        variant="danger"
        requireReason={true}
        onConfirm={handleReverse}
        onCancel={() => setConfirmReverseOpen(false)}
      />
    </div>
  );
};
