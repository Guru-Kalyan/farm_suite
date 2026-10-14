import React from 'react';
import { shareBillViaWhatsApp } from '../../utils/whatsappShare';

export const WhatsAppShareButton = ({
  bill,
  type = 'sales', // 'sales', 'purchase', 'trade_sale'
  size = 'sm',
  variant = 'icon' // 'icon' or 'button'
}) => {
  const handleShare = (e) => {
    e.stopPropagation();

    let transactionType = 'Sales Invoice';
    let partyType = 'Customer';
    let partyName = bill?.customer?.customer_name || bill?.customer || 'Customer';

    if (type === 'purchase') {
      transactionType = 'Trade Purchase Bill';
      partyType = 'Vendor / Supplier';
      partyName = bill?.vendor?.vendor_name || bill?.vendor || 'Vendor';
    } else if (type === 'trade_sale' || bill?.sale_type === 'TRADE') {
      transactionType = 'Trade Sale Invoice';
      partyType = 'Customer';
      partyName = bill?.customer?.customer_name || bill?.customer || 'Customer';
    }

    shareBillViaWhatsApp({
      billNumber: bill?.bill_number || '',
      transactionType,
      billDate: bill?.bill_date,
      partyType,
      partyName,
      totalAmount: bill?.grand_total || '0.00',
      amountPaid: bill?.amount_paid || '0.00',
      paymentStatus: bill?.payment_status || 'UNPAID',
      remainingBalance: bill?.remaining_balance || '0.00'
    });
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title="Share bill details via WhatsApp"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: size === 'sm' ? '6px 12px' : '8px 16px',
          backgroundColor: '#25D366',
          color: '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: size === 'sm' ? '12px' : '13px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1ebd56'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#25D366'; }}
      >
        <span style={{ fontSize: '15px' }}>💬</span>
        <span>Share via WhatsApp</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      title="Share bill details via WhatsApp"
      aria-label="Share bill details via WhatsApp"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        backgroundColor: 'rgba(37, 211, 102, 0.12)',
        color: '#15803d',
        border: '1px solid rgba(37, 211, 102, 0.35)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#25D366';
        e.currentTarget.style.color = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.12)';
        e.currentTarget.style.color = '#15803d';
      }}
    >
      💬
    </button>
  );
};
