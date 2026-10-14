import { formatCurrency, formatDate } from './formatters';

/**
 * Builds and opens a standard WhatsApp share URL (wa.me/?text=...)
 * with transaction details prefilled. Allows user to select recipient manually.
 */
export function shareBillViaWhatsApp({
  billNumber,
  transactionType = 'Sales Invoice',
  billDate,
  partyType = 'Customer',
  partyName,
  totalAmount,
  amountPaid = '0.00',
  paymentStatus = 'UNPAID',
  remainingBalance = '0.00',
}) {
  const normStatus = (paymentStatus || '').replace('_', ' ').toUpperCase();

  const lines = [
    `*FARM SUIT — Business Management*`,
    `📄 *${transactionType}*`,
    `----------------------------------------`,
    `*Bill No:* ${billNumber}`,
    `*Date:* ${formatDate(billDate)}`,
    `*${partyType}:* ${partyName || 'N/A'}`,
    `----------------------------------------`,
    `*Total Amount:* ${formatCurrency(totalAmount)}`,
    `*Amount Paid / Received:* ${formatCurrency(amountPaid)}`,
    `*Payment Status:* ${normStatus}`,
    `*Outstanding Balance:* ${formatCurrency(remainingBalance)}`,
    `----------------------------------------`,
    `📌 _Note: You can download and attach the official PDF copy from Farm Suit._`,
    `Thank you for doing business with Farm Suit!`
  ];

  const message = lines.join('\n');
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

export function generateSaleWhatsAppUrl(sale) {
  const normStatus = (sale.payment_status || 'UNPAID').replace('_', ' ').toUpperCase();
  const partyName = sale.customer?.customer_name || sale.customer?.name || 'Customer';
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
    `📌 _Note: You can download and attach the official PDF copy from Farm Suit._`,
    `Thank you for doing business with Farm Suit!`
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function generatePurchaseWhatsAppUrl(bill) {
  const normStatus = (bill.payment_status || 'UNPAID').replace('_', ' ').toUpperCase();
  const partyName = bill.vendor?.vendor_name || 'Vendor';
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
    `📌 _Note: You can download and attach the official PDF copy from Farm Suit._`,
    `Thank you for doing business with Farm Suit!`
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

