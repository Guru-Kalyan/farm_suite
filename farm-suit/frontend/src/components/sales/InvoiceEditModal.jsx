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
  const [items, setItems] = useState([]);
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

  // Load customer master & items master
  useEffect(() => {
    if (isOpen) {
      mastersApi.getCustomers()
        .then(res => {
          if (res?.data?.customers) setCustomers(res.data.customers);
        })
        .catch(() => {});

      mastersApi.getItems()
        .then(res => {
          if (res?.data?.items) setItems(res.data.items);
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
              item_id: String(l.item?.id || ''),
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

  // Handle item product dropdown change
  const handleItemChange = (idx, selectedItemId) => {
    const selected = items.find(it => String(it.id) === String(selectedItemId));
    setLines(prev => {
      const updated = [...prev];
      const current = updated[idx];
      const newRate = (parseFloat(current.selling_rate) > 0 || !selected?.default_selling_price)
        ? current.selling_rate
        : String(selected.default_selling_price);

      const q = parseFloat(current.quantity) || 0;
      const r = parseFloat(newRate) || 0;

      updated[idx] = {
        ...current,
        item_id: String(selectedItemId),
        item_name: selected ? selected.name : current.item_name,
        unit: selected ? (selected.unit?.short_name || selected.unit?.name || selected.unit || '') : current.unit,
        selling_rate: newRate,
        amount: (q * r).toFixed(2)
      };
      return updated;
    });
  };

  // Handle line item quantity, rate, or amount changes
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

  // Add a new line item
  const handleAddLine = () => {
    const defaultItem = items.length > 0 ? items[0] : null;
    const defaultRate = defaultItem && defaultItem.default_selling_price ? String(defaultItem.default_selling_price) : '0';
    setLines(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        item_id: defaultItem ? String(defaultItem.id) : '',
        item_name: defaultItem ? defaultItem.name : 'Select item',
        unit: defaultItem ? (defaultItem.unit?.short_name || defaultItem.unit?.name || defaultItem.unit || '') : '',
        quantity: '1',
        selling_rate: defaultRate,
        amount: (1 * parseFloat(defaultRate || 0)).toFixed(2)
      }
    ]);
  };

  // Remove a line item
  const handleRemoveLine = (index) => {
    if (lines.length <= 1) {
      addToast('Invoice must contain at least one product item', 'warning');
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== index));
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

    if (!lines || lines.length === 0) {
      setErrorMsg('At least one line item is required');
      return;
    }

    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].item_id) {
        setErrorMsg(`Line ${i + 1}: Please select an item / product`);
        return;
      }
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
      maxWidth="800px"
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
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                INVOICE LINE ITEMS ({lines.length}) — EDIT PRODUCT, QUANTITY & RATE
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLine}
                title="Add product to this invoice"
                style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
              >
                + Add Line Item
              </Button>
            </div>

            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '220px' }}>Item / Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Rate (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px' }}>Amount (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Product Selector Dropdown */}
                      <td style={{ padding: '6px 10px', verticalAlign: 'middle' }}>
                        <select
                          value={String(l.item_id)}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px',
                            fontWeight: '600'
                          }}
                        >
                          {!items.some(it => String(it.id) === String(l.item_id)) && (
                            <option value={String(l.item_id)}>
                              {l.item_name} {l.unit ? `(${l.unit})` : ''}
                            </option>
                          )}
                          {items.map(it => (
                            <option key={it.id} value={String(it.id)}>
                              {it.name} [{it.item_code}] ({it.unit?.short_name || it.unit?.name || it.unit || ''})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity Input */}
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={l.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
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

                      {/* Selling Rate Input */}
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.selling_rate}
                          onChange={(e) => handleLineChange(idx, 'selling_rate', e.target.value)}
                          placeholder="Rate"
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

                      {/* Line Amount Input */}
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={l.amount}
                          onChange={(e) => handleLineChange(idx, 'amount', e.target.value)}
                          placeholder="Amount"
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

                      {/* Delete Line Action */}
                      <td style={{ padding: '6px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            title="Remove line"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              fontSize: '14px',
                              lineHeight: 1
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', fontWeight: '700' }}>
                    <td style={{ padding: '8px 12px' }}>Total Subtotal</td>
                    <td colSpan="2"></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--primary)' }}>
                      {formatCurrency(currentSubtotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
