import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadSalesBillPdf } from '../../utils/pdfDownload';
import { useToast } from '../../hooks/useToast';

export const BillPreviewModal = ({ isOpen, onClose, bill }) => {
  const { addToast } = useToast();

  if (!bill) return null;

  const handleDownload = async () => {
    try {
      addToast('Generating official bill PDF...', 'info');
      await downloadSalesBillPdf(bill.id, bill.bill_number);
      addToast('PDF downloaded successfully!', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to download PDF', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Bill Preview — ${bill.bill_number}`}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handlePrint}>
            🖨️ Print
          </Button>
          <Button variant="primary" onClick={handleDownload}>
            📥 Download PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #cbd5e1',
        fontSize: '13px'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #15803d', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ color: '#15803d', fontSize: '1.8rem', margin: 0 }}>FARM SUIT</h1>
            <p style={{ color: '#475569', fontSize: '11px', margin: '2px 0 0 0' }}>
              Farm Business Management Platform • Agricultural Trading & Harvest
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: '#0f172a' }}>TAX INVOICE</h2>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>{bill.bill_number}</div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Date: {formatDate(bill.bill_date)}</div>
            <div style={{ marginTop: '4px' }}><StatusBadge status={bill.status} /></div>
          </div>
        </div>

        {/* Customer & Bill Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <div>
            <div style={{ fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Billed To:</div>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>{bill.customer?.customer_name || 'Customer'}</div>
            {bill.customer?.customer_code && <div style={{ color: '#64748b' }}>Code: {bill.customer.customer_code}</div>}
            {bill.customer?.phone && <div>Phone: {bill.customer.phone}</div>}
            {bill.customer?.gst_number && <div>GSTIN: {bill.customer.gst_number}</div>}
            {bill.customer?.address && <div style={{ color: '#475569', marginTop: '2px' }}>{bill.customer.address}</div>}
          </div>
          <div>
            <div style={{ fontWeight: '700', color: '#475569', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Invoice Details:</div>
            <div><b>Prepared By:</b> {bill.created_by || 'Admin'}</div>
            <div><b>Payment Status:</b> {bill.status === 'POSTED' ? 'Finalized' : bill.status}</div>
            <div><b>Currency:</b> INR (₹)</div>
            {bill.remarks && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748b' }}>Remarks: {bill.remarks}</div>}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#15803d', color: '#ffffff', textAlign: 'left', fontSize: '12px' }}>
              <th style={{ padding: '8px 10px', width: '30px' }}>#</th>
              <th style={{ padding: '8px 10px' }}>Item & Lot Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity</th>
              <th style={{ padding: '8px 10px' }}>Unit</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(bill.lines || []).map((line, idx) => (
              <tr key={line.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                <td style={{ padding: '8px 10px' }}>
                  <b>{line.item?.name || 'Item'}</b>
                  {line.lot?.lot_number && (
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Lot: {line.lot.lot_number} ({line.lot.source_type})
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{line.quantity}</td>
                <td style={{ padding: '8px 10px' }}>{line.item?.unit || ''}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(line.selling_rate)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(line.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {parseFloat(bill.discount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>Discount:</span>
                <span>- {formatCurrency(bill.discount)}</span>
              </div>
            )}
            {parseFloat(bill.tax_amount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Tax:</span>
                <span>{formatCurrency(bill.tax_amount)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '15px',
              fontWeight: '800',
              color: '#15803d',
              borderTop: '2px solid #15803d',
              paddingTop: '8px',
              marginTop: '4px'
            }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(bill.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>
          <div>Customer Signature</div>
          <div>Authorized Signatory for Farm Suit</div>
        </div>
      </div>
    </Modal>
  );
};
