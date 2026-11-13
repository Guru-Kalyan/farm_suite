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
  const [lines, setLines] = useState([]);
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
          setDiscount(b.discount !== undefined ? String(b.discount) : '0.00');
          setRemarks(b.remarks || '');
          setTransportCost(b.transport_cost !== undefined ? String(b.transport_cost) : '0.00');
          setPackagingCost(b.packaging_cost !== undefined ? String(b.packaging_cost) : '0.00');
          setOtherSellingExpenses(b.other_selling_expenses !== undefined ? String(b.other_selling_expenses) : '0.00');

          const loadedLines = (b.lines || []).map(l => {
            const q = l.quantity !== undefined ? parseFloat(l.quantity) : 0;
            const r = l.selling_rate !== undefined ? parseFloat(l.selling_rate) : 0;
            return {
              id: l.id,
              item_id: l.item?.id,
              item_name: l.item?.name || 'Item',
              unit: l.item?.unit || '',
              quantity: String(q),
              selling_rate: String(r),
              amount: (q * r).toFixed(2)
            };
          });
          setLines(loadedLines);
        })
        .catch(err => {
          setErrorMsg(err.message || 'Failed to load bill details');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, bill]);

  // Handle line item field changes
  const handleLineChange = (index, field, value) => {
    setLines(prev => {
      const updated = [...prev];
      const line = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'selling_rate') {
        const q = parseFloat(field === 'quantity' ? value : line.quantity) || 0;
        const r = parseFloat(field === 'selling_rate' ? value : line.selling_rate) || 0;
        line.amount = (q * r).toFixed(2);
      } else if (field === 'amount') {
        const a = parseFloat(value) || 0;
        const q = parseFloat(line.quantity) || 0;
        if (q > 0) {
          line.selling_rate = (a / q).toFixed(2);
        }
      }
      updated[index] = line;
      return updated;
    });
  };

  // Live total calculations
  const currentSubtotal = lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0;
    const r = parseFloat(l.selling_rate) || 0;
    return sum + (q * r);
  }, 0);

  const discountNum = parseFloat(discount) || 0;
  const currentGrandTotal = Math.max(0, currentSubtotal - discountNum);
  const amountPaidNum = parseFloat(billData?.amount_paid || bill?.amount_paid || 0);
  const currentBalance = Math.max(0, currentGrandTotal - amountPaidNum);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!billData) return;

    if (!billDate) {
      setErrorMsg('Bill date is required');
      return;
    }
    if (!customerId) {
      setErrorMsg('Customer is required');
      return;
    }

    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      const q = parseFloat(lines[i].quantity);
      const r = parseFloat(lines[i].selling_rate);
      if (isNaN(q) || q <= 0) {
        setErrorMsg(`Line ${i + 1} (${lines[i].item_name}): Quantity must be greater than 0`);
        return;
      }
      if (isNaN(r) || r < 0) {
        setErrorMsg(`Line ${i + 1} (${lines[i].item_name}): Selling rate cannot be negative`);
        return;
      }
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        bill_date: billDate,
        customer_id: customerId,
        discount: discountNum,
        remarks: remarks.trim(),
        items: lines.map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity) || 0,
          selling_rate: parseFloat(l.selling_rate) || 0
        }))
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Invoice: ${billData?.bill_number || bill?.bill_number || ''}`}
      maxWidth="750px"
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
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Total: <b style={{ color: 'var(--primary)' }}>{formatCurrency(currentGrandTotal)}</b></span>
              <span>Paid: <b style={{ color: 'var(--success)' }}>{formatCurrency(amountPaidNum)}</b></span>
              <span>Bal: <b style={{ color: currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(currentBalance)}</b></span>
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

          {/* Editable Lines Section */}
          {lines && lines.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  INVOICE LINE ITEMS ({lines.length}) — EDIT QUANTITY & RATE
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Line total updates automatically
                </div>
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
                      <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => (
                      <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{l.item_name}</div>
                          {l.unit && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Unit: {l.unit}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={l.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            style={{
                              width: '100%',
                              textAlign: 'right',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px',
                              fontWeight: '600'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={l.selling_rate}
                            onChange={(e) => handleLineChange(idx, 'selling_rate', e.target.value)}
                            style={{
                              width: '100%',
                              textAlign: 'right',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px',
                              fontWeight: '600'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={l.amount}
                            onChange={(e) => handleLineChange(idx, 'amount', e.target.value)}
                            style={{
                              width: '100%',
                              textAlign: 'right',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px',
                              fontWeight: '700'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', fontWeight: '700' }}>
                      <td style={{ padding: '8px 12px' }}>Total Subtotal</td>
                      <td colSpan="2"></td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--primary)' }}>
                        {formatCurrency(currentSubtotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};
