import { formatCurrency, formatDate } from './formatters';
import { salesApi } from '../api/sales';
import { purchasesApi } from '../api/purchases';
import { downloadBlob } from '../api/client';

/**
 * Builds the text message and handles sharing via WhatsApp with PDF attachment.
 * Multi-tier flow:
 * 1. Generates text summary with direct PDF link for easy in-chat opening.
 * 2. Attempts native Web Share API with attached PDF file (Mobile / Chrome / Edge).
 * 3. If file sharing is not supported by the browser (e.g. desktop PC without Web Share file support),
 *    it auto-downloads the PDF file to user's device and opens WhatsApp Web (wa.me) in a new tab.
 */
export async function shareBillViaWhatsApp({
  billId,
  billNumber,
  transactionType = 'Sales Invoice',
  billDate,
  partyType = 'Customer',
  partyName,
  totalAmount,
  amountPaid = '0.00',
  paymentStatus = 'UNPAID',
  remainingBalance = '0.00',
  type = 'sales' // 'sales' | 'purchase' | 'trade_sale'
}) {
  const normStatus = (paymentStatus || '').replace('_', ' ').toUpperCase();
  const pdfEndpoint = type === 'purchase'
    ? `/api/purchases/${billId}/pdf/`
    : `/api/sales/${billId}/pdf/`;
  const directPdfUrl = billId ? `${window.location.origin}${pdfEndpoint}` : null;

  const lines = [
    `*FARM SUIT — Business Management*`,
    `📄 *${transactionType}*`,
    `----------------------------------------`,
    `*Bill No:* ${billNumber || 'N/A'}`,
    `*Date:* ${formatDate(billDate)}`,
    `*${partyType}:* ${partyName || 'N/A'}`,
    `----------------------------------------`,
    `*Total Amount:* ${formatCurrency(totalAmount)}`,
    `*Amount Paid / Received:* ${formatCurrency(amountPaid)}`,
    `*Payment Status:* ${normStatus}`,
    `*Outstanding Balance:* ${formatCurrency(remainingBalance)}`,
    `----------------------------------------`,
    ...(directPdfUrl ? [`📥 *View / Download PDF Invoice:*`, directPdfUrl, `----------------------------------------`] : []),
    `Thank you for doing business with Farm Suit!`
  ];

  const message = lines.join('\n');
  const filename = `FarmSuit_${(billNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // Try fetching PDF blob for native attachment or auto-download
  let blob = null;
  if (billId) {
    try {
      if (type === 'purchase') {
        blob = await purchasesApi.getPdfBlob(billId);
      } else {
        blob = await salesApi.getPdfBlob(billId);
      }
    } catch (err) {
      console.warn("Could not retrieve PDF blob for WhatsApp sharing:", err);
    }
  }

  // Tier 1: Check native Web Share API with File attachment (Works on mobile & supported browsers)
  if (blob && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${transactionType} - ${billNumber}`,
          text: message,
          files: [pdfFile]
        });
        return { success: true, method: 'native-share', message: 'PDF attached and opened in share sheet!' };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled share dialog
        return { success: false, aborted: true };
      }
      console.warn("Web Share API file share failed, falling back to WhatsApp Web:", err);
    }
  }

  // Tier 2: Desktop Fallback - Auto-download the PDF to user's device and launch WhatsApp Web
  if (blob) {
    try {
      downloadBlob(blob, filename);
    } catch (err) {
      console.warn("Could not trigger PDF download:", err);
    }
  }

  // Open WhatsApp with prefilled text and direct PDF link
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  return {
    success: true,
    method: 'fallback',
    message: blob ? 'PDF downloaded! WhatsApp opened to send invoice.' : 'WhatsApp opened with bill details.'
  };
}

export function generateSaleWhatsAppUrl(sale) {
  const normStatus = (sale.payment_status || 'UNPAID').replace('_', ' ').toUpperCase();
  const partyName = sale.customer?.customer_name || sale.customer?.name || 'Customer';
  const directPdfUrl = sale.id ? `${window.location.origin}/api/sales/${sale.id}/pdf/` : null;

  const lines = [
    `*FARM SUIT — Business Management*`,
    `📄 *${sale.sale_type === 'TRADE' ? 'Trade Sale Invoice' : 'Sales Invoice'}*`,
    `----------------------------------------`,
    `*Bill No:* ${sale.bill_number}`,
    `*Date:* ${formatDate(sale.bill_date)}`,
    `*Customer:* ${partyName}`,
    `----------------------------------------`,
    `*Total Amount:* ${formatCurrency(sale.grand_total || sale.total_amount)}`,
    `*Amount Received:* ${formatCurrency(sale.amount_paid || '0.00')}`,
    `*Payment Status:* ${normStatus}`,
    `*Remaining Balance:* ${formatCurrency(sale.remaining_balance || '0.00')}`,
    `----------------------------------------`,
    ...(directPdfUrl ? [`📥 *View / Download PDF Invoice:*`, directPdfUrl, `----------------------------------------`] : []),
    `Thank you for doing business with Farm Suit!`
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function generatePurchaseWhatsAppUrl(bill) {
  const normStatus = (bill.payment_status || 'UNPAID').replace('_', ' ').toUpperCase();
  const partyName = bill.vendor?.vendor_name || 'Vendor';
  const directPdfUrl = bill.id ? `${window.location.origin}/api/purchases/${bill.id}/pdf/` : null;

  const lines = [
    `*FARM SUIT — Business Management*`,
    `📄 *Trade Purchase Bill*`,
    `----------------------------------------`,
    `*Bill No:* ${bill.bill_number}`,
    `*Date:* ${formatDate(bill.bill_date)}`,
    `*Vendor:* ${partyName}`,
    `----------------------------------------`,
    `*Total Landed Cost:* ${formatCurrency(bill.total_landed_cost || bill.grand_total)}`,
    `*Amount Paid:* ${formatCurrency(bill.amount_paid || '0.00')}`,
    `*Payment Status:* ${normStatus}`,
    `*Balance Payable:* ${formatCurrency(bill.remaining_balance || (parseFloat(bill.grand_total || 0) - parseFloat(bill.amount_paid || 0)))}`,
    `----------------------------------------`,
    ...(directPdfUrl ? [`📥 *View / Download PDF Bill:*`, directPdfUrl, `----------------------------------------`] : []),
    `Thank you for doing business with Farm Suit!`
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
