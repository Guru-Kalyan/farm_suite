import React, { useState, useEffect } from 'react';
import { salesApi } from '../../api/sales';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const SalesCreatePage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState('REGULAR');
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [discount, setDiscount] = useState('0.00');
  const [remarks, setRemarks] = useState('');

  // Trade sale selling expenses
  const [transportCost, setTransportCost] = useState('0.00');
  const [packagingCost, setPackagingCost] = useState('0.00');
  const [otherSellingExpenses, setOtherSellingExpenses] = useState('0.00');

  // Initial payment on creation
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [lines, setLines] = useState([
    { item_id: '', quantity: '10', selling_rate: '80', available_stock: '0', unit: '' }
  ]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setBillNumber(`INV-${new Date().getFullYear()}-${rand}`);

    mastersApi.getCustomers().then(res => {
      if (res && res.data && res.data.customers) {
        setCustomers(res.data.customers);
        if (res.data.customers.length > 0) setCustomerId(String(res.data.customers[0].id));
      }
    }).catch(() => {});

    mastersApi.getItems().then(res => {
      if (res && res.data && res.data.items) {
        setItems(res.data.items);
        if (res.data.items.length > 0) {
          const first = res.data.items[0];
          setLines([{
            item_id: String(first.id),
            quantity: '10',
            selling_rate: '80',
            available_stock: String(first.current_stock || '0'),
            unit: first.unit?.short_name || ''
          }]);
        }
      }
    }).catch(() => {});
  }, []);

  const handleAddLine = () => {
    const defaultItem = items.length > 0 ? items[0] : null;
    setLines([...lines, {
      item_id: defaultItem ? String(defaultItem.id) : '',
      quantity: '1',
      selling_rate: '0',
      available_stock: defaultItem ? String(defaultItem.current_stock || '0') : '0',
      unit: defaultItem ? (defaultItem.unit?.short_name || '') : ''
    }]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length === 1) {
      addToast('A sales bill must have at least one line item', 'warning');
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, newItemId) => {
    const chosen = items.find(it => String(it.id) === String(newItemId));
    const updated = [...lines];
    updated[idx].item_id = newItemId;
    if (chosen) {
      updated[idx].available_stock = String(chosen.current_stock || '0');
      updated[idx].unit = chosen.unit?.short_name || '';
    }
    setLines(updated);
  };

  const handleLineFieldChange = (idx, field, value) => {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  };

  // Calculations for display
  const subtotal = lines.reduce((acc, l) => {
    const q = parseFloat(l.quantity) || 0;
    const r = parseFloat(l.selling_rate) || 0;
    return acc + (q * r);
  }, 0);

  const tax = parseFloat(taxAmount) || 0;
  const disc = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal + tax - disc);

  const handleSubmit = async (shouldPost = false) => {
    if (!customerId) {
      setErrors({ customer_id: ['Customer is required'] });
      return;
    }
    if (!billNumber.trim()) {
      setErrors({ bill_number: ['Bill number is required'] });
      return;
    }

    // Check available stock in frontend before sending
    for (let i = 0; i < lines.length; i++) {
      const q = parseFloat(lines[i].quantity) || 0;
      const avail = parseFloat(lines[i].available_stock) || 0;
      if (q > avail) {
        addToast(`Insufficient stock for line ${i + 1}. Requested: ${q}, Available: ${avail}`, 'error');
        return;
      }
    }

    const payload = {
      customer_id: customerId,
      bill_number: billNumber.trim(),
      bill_date: billDate,
      sale_type: saleType,
      tax_amount: taxAmount,
      discount,
      remarks,
      transport_cost: saleType === 'TRADE' ? transportCost : '0.00',
      packaging_cost: saleType === 'TRADE' ? packagingCost : '0.00',
      other_selling_expenses: saleType === 'TRADE' ? otherSellingExpenses : '0.00',
      items: lines.map(l => ({
        item_id: l.item_id,
        quantity: l.quantity,
        selling_rate: l.selling_rate
      }))
    };

    if (recordInitialPayment && parseFloat(amountReceived) > 0) {
      payload.amount_received = amountReceived;
      payload.payment_method = paymentMethod;
      payload.payment_reference = paymentReference;
      payload.payment_notes = paymentNotes;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const res = await salesApi.createSale(payload);
      if (res && res.data && res.data.id) {
        const billId = res.data.id;
        if (shouldPost) {
          const itemsPayload = lines.map(l => ({
            item_id: l.item_id,
            quantity: l.quantity,
            selling_rate: l.selling_rate
          }));
          await salesApi.postSale(billId, itemsPayload);
          addToast(`Sales bill ${billNumber} created and posted! Stock deducted.`, 'success');
        } else {
          addToast(`Sales bill draft ${billNumber} saved successfully!`, 'success');
        }
        onNavigate(`/sales/${billId}`);
      }
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      addToast(err.message || 'Failed to save sales bill', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Create Sales Invoice</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Book a regular farm sale or trade sale with live stock verification and optional initial payment
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/sales')}>
          Cancel
        </Button>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Header Fields Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} ({c.customer_code})
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <span style={{ color: 'var(--danger)', fontSize: '11px' }}>{errors.customer_id[0]}</span>
            )}
          </div>

          <Input
            label="Invoice Number *"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            error={errors.bill_number ? errors.bill_number[0] : null}
            required
          />

          <Input
            label="Invoice Date *"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            required
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
              Sale Type *
            </label>
            <select
              value={saleType}
              onChange={(e) => setSaleType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <option value="REGULAR">Regular Farm Sale</option>
              <option value="TRADE">Trade Sale (External Resale)</option>
            </select>
          </div>
        </div>

        {/* Trade Selling Expenses Section (if TRADE selected) */}
        {saleType === 'TRADE' && (
          <div style={{
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            border: '1px dashed var(--primary)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary)', fontWeight: '700' }}>
              📦 Trade Sale Attributable Selling Expenses (Section 6.1)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <Input
                label="Selling Transport / Delivery (₹)"
                type="number"
                step="0.01"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Selling Packaging Cost (₹)"
                type="number"
                step="0.01"
                min="0"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Other Selling Expenses (₹)"
                type="number"
                step="0.01"
                min="0"
                value={otherSellingExpenses}
                onChange={(e) => setOtherSellingExpenses(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Invoice Line Items</h3>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 12px', minWidth: '220px' }}>Item / Product</th>
                <th style={{ padding: '8px 12px', width: '140px' }}>Available Stock</th>
                <th style={{ padding: '8px 12px', width: '150px' }}>Quantity</th>
                <th style={{ padding: '8px 12px', width: '150px' }}>Selling Rate (₹)</th>
                <th style={{ padding: '8px 12px', width: '140px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineAmount = (parseFloat(line.quantity) || 0) * (parseFloat(line.selling_rate) || 0);
                const isOverStock = (parseFloat(line.quantity) || 0) > (parseFloat(line.available_stock) || 0);

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={line.item_id}
                        onChange={(e) => handleItemChange(idx, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }}
                      >
                        {items.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.name} [{it.item_code}] ({it.unit?.short_name})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontWeight: '700',
                        color: parseFloat(line.available_stock) > 0 ? 'var(--primary)' : 'var(--danger)'
                      }}>
                        {line.available_stock} {line.unit}
                      </span>
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={line.quantity}
                        onChange={(e) => handleLineFieldChange(idx, 'quantity', e.target.value)}
                        suffix={line.unit}
                        error={isOverStock ? 'Exceeds stock!' : null}
                      />
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.selling_rate}
                        onChange={(e) => handleLineFieldChange(idx, 'selling_rate', e.target.value)}
                        prefix="₹"
                      />
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {formatCurrency(lineAmount)}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button variant="ghost" size="sm" onClick={handleAddLine}>
          + Add Line Item
        </Button>

        {/* Initial Payment Section */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface-secondary)',
          border: '1px solid var(--border-subtle)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700' }}>
            <input
              type="checkbox"
              checked={recordInitialPayment}
              onChange={(e) => setRecordInitialPayment(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span>Record initial payment received on bill creation (Section 4.1)</span>
          </label>

          {recordInitialPayment && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginTop: '14px'
            }}>
              <Input
                label="Amount Received (₹) *"
                type="number"
                step="0.01"
                min="0.01"
                max={grandTotal}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={String(grandTotal)}
              />
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'UPI', label: 'UPI / QR Code' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CASH', label: 'Cash' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </div>
              <Input
                label="Reference / Transaction No."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="UTR / UPI Ref No."
              />
              <Input
                label="Payment Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Received via GPay"
              />
            </div>
          )}
        </div>

        {/* Totals & Submit */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div>
            <Input
              label="Remarks / Dispatch Terms"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Dispatched via express cargo. Thank you for your business!"
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px' }}>Tax Amount (+):</span>
              <div style={{ width: '120px' }}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  prefix="₹"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px' }}>Discount (-):</span>
              <div style={{ width: '120px' }}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  prefix="₹"
                />
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
              <span style={{ fontWeight: '700' }}>Grand Total:</span>
              <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{formatCurrency(grandTotal)}</span>
            </div>

            {recordInitialPayment && parseFloat(amountReceived) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success-text)' }}>
                <span>Initial Payment:</span>
                <span style={{ fontWeight: '700' }}>- {formatCurrency(amountReceived)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button
            variant="ghost"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            Save as Draft
          </Button>

          <Button
            variant="primary"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Post Bill & Deduct Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
};
