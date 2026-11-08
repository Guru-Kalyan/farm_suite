import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { salesApi } from '../../api/sales';
import { mastersApi } from '../../api/masters';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';

export const InvoiceEditModal = ({ isOpen, bill, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billData, setBillData] = useState(null);

  // Form states
  const [billDate, setBillDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [remarks, setRemarks] = useState('');
  const [transportCost, setTransportCost] = useState('0.00');
  const [packagingCost, setPackagingCost] = useState('0.00');
  const [otherSellingExpenses, setOtherSellingExpenses] = useState('0.00');
  const [errorMsg, setErrorMsg] = useState('');

  // Load customer master
  useEffect(() => {
    if (isOpen) {
      mastersApi.getCustomers()
        .then(res => {
          if (res?.data?.customers) setCustomers(res.data.customers);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Load detailed bill
  useEffect(() => {
    if (isOpen && bill?.id) {
      setLoading(true);
      setErrorMsg('');
      salesApi.getSale(bill.id)
        .then(res => {
          const b = res?.data || bill;
          setBillData(b);
          setBillDate(b.bill_date ? String(b.bill_date).split('T')[0] : '');
          setCustomerId(b.customer?.id ? String(b.customer.id) : '');
          setDiscount(b.discount ? String(b.discount) : '0.00');
          setRemarks(b.remarks || '');
          setTransportCost(b.transport_cost ? String(b.transport_cost) : '0.00');
          setPackagingCost(b.packaging_cost ? String(b.packaging_cost) : '0.00');
          setOtherSellingExpenses(b.other_selling_expenses ? String(b.other_selling_expenses) : '0.00');
        })
        .catch(err => {
          setErrorMsg(err.message || 'Failed to load bill details');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, bill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!billData) return;

    if (!billDate) {
      setErrorMsg('Bill date is required');
      return;
    }
    if (!customerId) {
      setErrorMsg('Customer is required');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        bill_date: billDate,
        customer_id: customerId,
        discount: parseFloat(discount) || 0,
        remarks: remarks.trim()
      };

      if (billData.sale_type === 'TRADE') {
        payload.transport_cost = parseFloat(transportCost) || 0;
        payload.packaging_cost = parseFloat(packagingCost) || 0;
        payload.other_selling_expenses = parseFloat(otherSellingExpenses) || 0;
      }

      await salesApi.updateSale(billData.id, payload);
      addToast(`Invoice ${billData.bill_number} updated successfully`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.message || (err.errors ? JSON.stringify(err.errors) : 'Failed to update invoice');
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isTrade = billData?.sale_type === 'TRADE' || bill?.sale_type === 'TRADE';
  const amountPaidNum = parseFloat(billData?.amount_paid || bill?.amount_paid || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Invoice: ${billData?.bill_number || bill?.bill_number || ''}`}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            Save Changes
          </Button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading invoice details...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12.5px'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span style={{ fontWeight: '700', color: billData?.status === 'POSTED' ? 'var(--success)' : 'var(--warning)' }}>
                {billData?.status || 'POSTED'}
              </span>
              {isTrade && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  borderRadius: '4px',
                  fontWeight: '700'
                }}>
                  TRADE SALE
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span>Total: <b>{formatCurrency(billData?.grand_total || bill?.grand_total || 0)}</b></span>
              <span>Paid: <b style={{ color: 'var(--success)' }}>{formatCurrency(amountPaidNum)}</b></span>
              <span>Bal: <b style={{ color: 'var(--danger)' }}>{formatCurrency(billData?.remaining_balance || bill?.remaining_balance || 0)}</b></span>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12.5px'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Invoice Date"
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />

            <Select
              label="Customer"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={[
                { value: '', label: 'Select customer...' },
                ...customers.map(c => ({
                  value: String(c.id),
                  label: `${c.customer_name || c.name} (${c.customer_code || c.code || ''})`
                }))
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Bill Discount (₹)"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              helperText="Discount deducted from subtotal"
            />

            <Input
              label="Remarks / Dispatch Notes"
              placeholder="e.g. Dispatched via express cargo"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Trade Sales Expense Breakdown */}
          {isTrade && (
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                🚚 Trade Selling Expenses (Affects Net Margin)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <Input
                  label="Transport Cost (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transportCost}
                  onChange={(e) => setTransportCost(e.target.value)}
                />
                <Input
                  label="Packaging Cost (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                />
                <Input
                  label="Other Selling Exp (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherSellingExpenses}
                  onChange={(e) => setOtherSellingExpenses(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Lines summary (Read-only view of products in invoice) */}
          {billData?.lines && billData.lines.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>
                INVOICE LINE ITEMS ({billData.lines.length})
              </div>
              <div style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.lines.map((l, idx) => (
                      <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px' }}>{l.item?.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{l.quantity} {l.item?.unit}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{l.selling_rate}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>₹{l.revenue || (parseFloat(l.quantity) * parseFloat(l.selling_rate)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};

