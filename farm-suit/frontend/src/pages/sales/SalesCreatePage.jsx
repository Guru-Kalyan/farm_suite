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
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [discount, setDiscount] = useState('0.00');
  const [remarks, setRemarks] = useState('');

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
      tax_amount: taxAmount,
      discount,
      remarks,
      items: lines.map(l => ({
        item_id: l.item_id,
        quantity: l.quantity,
        selling_rate: l.selling_rate
      }))
    };

    try {
      setSubmitting(true);
      setErrors({});

      const res = await salesApi.createSale(payload);
      const createdId = res.data.id;

      if (shouldPost) {
        await salesApi.postSale(createdId, payload.items);
        addToast(`Sales Bill ${billNumber} posted! FIFO stock consumed.`, 'success');
      } else {
        addToast(`Sales Bill ${billNumber} draft created successfully.`, 'success');
      }

      onNavigate(`/sales/${createdId}`);
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      addToast(err.message || 'Failed to create sales bill', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Create Sales Bill & Invoice</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Authoritative FIFO lot deduction, customer billing, and official invoice generation
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/sales')}>
          ← Back to Sales
        </Button>
      </div>

      {/* Bill Meta */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        <Select
          label="Customer"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customers.map(c => ({ value: c.id, label: `${c.customer_name} (${c.customer_code})` }))}
          error={errors.customer_id}
        />

        <Input
          label="Invoice Bill Number"
          required
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
          placeholder="e.g. INV-2026-001"
          error={errors.bill_number}
        />

        <Input
          label="Invoice Date"
          type="date"
          required
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
        />
      </div>

      {/* Line Items Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Order Line Items</h3>
          <Button variant="secondary" size="sm" onClick={handleAddLine}>
            + Add Another Item
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: '30%' }}>Item</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: '15%' }}>Available Stock</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '18%' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '18%' }}>Selling Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '15%' }}>Amount (₹)</th>
                <th style={{ padding: '10px 12px', width: '4%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineAmount = ((parseFloat(line.quantity) || 0) * (parseFloat(line.selling_rate) || 0));
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
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input
                label="Tax Amount"
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                prefix="₹"
              />
              <Input
                label="Discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                prefix="₹"
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.2rem',
              fontWeight: '800',
              color: 'var(--primary)',
              borderTop: '2px solid var(--border-subtle)',
              paddingTop: '10px',
              marginTop: '4px'
            }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => handleSubmit(false)}
                loading={submitting}
              >
                💾 Save Draft
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => handleSubmit(true)}
                loading={submitting}
              >
                🧾 Post & Generate Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
