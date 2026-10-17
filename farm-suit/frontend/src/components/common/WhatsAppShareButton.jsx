import React, { useState } from 'react';
import { shareBillViaWhatsApp } from '../../utils/whatsappShare';
import { useToast } from '../../hooks/useToast';

export const WhatsAppShareButton = ({
  bill,
  type = 'sales', // 'sales', 'purchase', 'trade_sale'
  size = 'sm',
  variant = 'icon', // 'icon' or 'button'
  label = 'Share via WhatsApp',
  title = 'Share invoice via WhatsApp with PDF',
  shareUrl = null
}) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();

    // If a simple direct URL is provided without bill data, fallback to direct open
    if (!bill && shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    let transactionType = 'Sales Invoice';
    let partyType = 'Customer';
    let partyName = bill?.customer?.customer_name || bill?.customer?.name || bill?.customer || 'Customer';

    if (type === 'purchase') {
      transactionType = 'Trade Purchase Bill';
      partyType = 'Vendor / Supplier';
      partyName = bill?.vendor?.vendor_name || bill?.vendor?.name || bill?.vendor || 'Vendor';
    } else if (type === 'trade_sale' || bill?.sale_type === 'TRADE') {
      transactionType = 'Trade Sale Invoice';
      partyType = 'Customer';
      partyName = bill?.customer?.customer_name || bill?.customer?.name || bill?.customer || 'Customer';
    }

    try {
      setLoading(true);
      const res = await shareBillViaWhatsApp({
        billId: bill?.id,
        billNumber: bill?.bill_number || '',
        transactionType,
        billDate: bill?.bill_date,
        partyType,
        partyName,
        totalAmount: bill?.grand_total || bill?.total_amount || '0.00',
        amountPaid: bill?.amount_paid || '0.00',
        paymentStatus: bill?.payment_status || 'UNPAID',
        remainingBalance: bill?.remaining_balance || '0.00',
        type: type === 'purchase' ? 'purchase' : 'sales'
      });

      if (res?.message) {
        addToast(res.message, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to share via WhatsApp', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        title={title}
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
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)'
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1ebd56'; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#25D366'; }}
      >
        <span style={{ fontSize: '15px' }}>{loading ? '⏳' : '💬'}</span>
        <span>{loading ? 'Preparing PDF...' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      title={title}
      aria-label={title}
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
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = '#25D366';
          e.currentTarget.style.color = '#ffffff';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.12)';
          e.currentTarget.style.color = '#15803d';
        }
      }}
    >
      {loading ? '⏳' : '💬'}
    </button>
  );
};
