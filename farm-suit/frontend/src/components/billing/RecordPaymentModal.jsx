import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { formatCurrency } from '../../utils/formatters';

export const RecordPaymentModal = ({
  isOpen,
  onClose,
  bill,
  type = 'sales', // 'sales' or 'purchase'
  onSubmit,
  loading = false
}) => {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const remaining = parseFloat(bill?.remaining_balance || 0);

  useEffect(() => {
    if (isOpen && bill) {
      setAmount(String(remaining > 0 ? remaining : ''));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('UPI');
      setReferenceNumber('');
      setNotes('');
      setError('');
    }
  }, [isOpen, bill, remaining]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (val > remaining) {
      setError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remaining)}.`);
      return;
    }

    setError('');
    onSubmit({
      payment_date: paymentDate,
      amount: String(val),
      payment_method: paymentMethod,
      reference_number: referenceNumber.trim(),
      notes: notes.trim()
    });
  };

  const isSales = type === 'sales';
  const partyLabel = isSales ? 'Customer' : 'Vendor';
  const partyName = isSales ? bill?.customer?.customer_name : bill?.vendor?.vendor_name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — ${bill?.bill_number || ''}`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Bill summary card */}
        <div style={{
          backgroundColor: 'var(--bg-surface-secondary)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          fontSize: '12.5px'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>{partyLabel}:</div>
            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{partyName || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Total Payable:</div>
            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatCurrency(bill?.grand_total)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Already Paid:</div>
            <div style={{ fontWeight: '700', color: 'var(--success-text)' }}>{formatCurrency(bill?.amount_paid)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Balance Remaining:</div>
            <div style={{ fontWeight: '800', color: remaining > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--danger-subtle)',
            color: 'var(--danger-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            border: '1px solid var(--danger)'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Payment Date *
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Amount (₹) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Payment Method *
            </label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'UPI', label: 'UPI / QR Code' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
                { value: 'CASH', label: 'Cash' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Ref / Transaction No.
            </label>
            <Input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR / UPI Ref / Cheque No."
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
            Notes / Remarks
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional payment notes..."
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || remaining <= 0}>
            {loading ? 'Recording...' : `Record ${formatCurrency(amount || 0)} Payment`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
