import React, { useState } from 'react';
import { Button } from '../common/Button';
import { downloadSalesBillPdf } from '../../utils/pdfDownload';
import { useToast } from '../../hooks/useToast';

export const BillActions = ({
  bill,
  onPost,
  onReverse,
  onPreview,
  onEdit,
  loading = false
}) => {
  const { addToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!bill) return null;

  const isDraft = bill.status === 'DRAFT';
  const isPosted = bill.status === 'POSTED';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      addToast('Generating official invoice PDF...', 'info');
      await downloadSalesBillPdf(bill.id, bill.bill_number);
      addToast('PDF downloaded successfully!', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to download PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} className="no-print">
      {isDraft && onEdit && (
        <Button variant="secondary" size="sm" onClick={onEdit} disabled={loading}>
          ✏️ Edit Draft
        </Button>
      )}

      {isDraft && onPost && (
        <Button variant="primary" size="sm" onClick={onPost} loading={loading}>
          ✅ Post Bill (Consume Stock)
        </Button>
      )}

      {onPreview && (
        <Button variant="secondary" size="sm" onClick={onPreview}>
          👁️ Preview Bill
        </Button>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        loading={downloading}
      >
        📥 Download PDF
      </Button>

      {isPosted && (
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          🖨️ Print
        </Button>
      )}

      {isPosted && onReverse && (
        <Button variant="danger" size="sm" onClick={onReverse} disabled={loading}>
          ↩️ Reverse Bill
        </Button>
      )}
    </div>
  );
};
