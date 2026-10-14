import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api/orders';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const OrderCreatePage = ({ onNavigate, initialType = 'REGULAR' }) => {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [orderType, setOrderType] = useState(initialType);
  const [customerId, setCustomerId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Initial advance fields
  const [initialAdvance, setInitialAdvance] = useState('0.00');
  const [advanceMethod, setAdvanceMethod] = useState('CASH');
  const [advanceRef, setAdvanceRef] = useState('');

  const [lines, setLines] = useState([
    { item_id: '', quantity: '10', unit_price: '60', notes: '' }
  ]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefix = orderType === 'ADVANCE' ? 'ADV' : 'ORD';
    setOrderNumber(`${prefix}-${new Date().getFullYear()}-${rand}`);

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
          setLines([{ item_id: String(res.data.items[0].id), quantity: '10', unit_price: '60', notes: '' }]);
        }
      }
    }).catch(() => {});
  }, [orderType]);

  const handleAddLine = () => {
    const defaultItemId = items.length > 0 ? String(items[0].id) : '';
    setLines([...lines, { item_id: defaultItemId, quantity: '1', unit_price: '0', notes: '' }]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length === 1) {
      addToast('An order must have at least one line item', 'warning');
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, value) => {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unit_price) || 0;
      return acc + (q * p);
    }, 0);
  };

  const estimatedTotal = calculateTotal();
  const advanceAmount = parseFloat(initialAdvance) || 0;
  const remainingExpected = Math.max(0, estimatedTotal - advanceAmount);

  const handleSubmit = async () => {
    if (!customerId) {
      setErrors({ customer_id: ['Customer is required'] });
      return;
    }
    if (!orderNumber.trim()) {
      setErrors({ order_number: ['Order number is required'] });
      return;
    }

    const payload = {
      order_type: orderType,
      customer_id: customerId,
      order_number: orderNumber.trim(),
      order_date: orderDate,
      requested_delivery_date: requestedDeliveryDate,
      delivery_notes: deliveryNotes,
      initial_advance_amount: orderType === 'ADVANCE' ? initialAdvance : '0.00',
      initial_advance_method: advanceMethod,
      initial_advance_reference: advanceRef,
      lines: lines.map(l => ({
        item_id: l.item_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        notes: l.notes
      }))
    };

    try {
      setSubmitting(true);
      setErrors({});
      const res = await ordersApi.createOrder(payload);
      addToast(`Order ${orderNumber} created successfully!`, 'success');
      onNavigate(`/orders/${res.data.id}`);
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      addToast(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            Book {orderType === 'ADVANCE' ? 'Advance Order' : 'Regular Order'}
          </h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Record customer delivery commitment without premature revenue recognition or stock reduction
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate(orderType === 'ADVANCE' ? '/orders/advance' : '/orders/regular')}>
          ← Back to Orders
        </Button>
      </div>

      {/* Meta Card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <Select
          label="Order Type"
          required
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
          options={[
            { value: 'REGULAR', label: 'Regular Order (Standard Delivery)' },
            { value: 'ADVANCE', label: 'Advance Order (Future Commitment with Token Advance)' }
          ]}
        />

        <Select
          label="Customer"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.code || ''})` }))}
          error={errors.customer_id}
        />

        <Input
          label="Order Number"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          error={errors.order_number}
        />

        <Input
          label="Order Date"
          type="date"
          required
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
        />

        <Input
          label="Requested Delivery Date"
          type="date"
          required
          value={requestedDeliveryDate}
          onChange={(e) => setRequestedDeliveryDate(e.target.value)}
          helperText="Scheduled delivery to customer"
        />
      </div>

      {/* Line Items */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Requested Products</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Stock will remain in inventory until order fulfillment
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleAddLine}>
            + Add Item
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: '35%' }}>Item / Crop</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Expected Price (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Est. Total (₹)</th>
                <th style={{ padding: '10px 12px', width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qty = parseFloat(line.quantity) || 0;
                const price = parseFloat(line.unit_price) || 0;
                const total = qty * price;
                const selectedItem = items.find(it => String(it.id) === String(line.item_id));

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={line.item_id}
                        onChange={(e) => handleLineChange(idx, 'item_id', e.target.value)}
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
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        suffix={selectedItem?.unit?.short_name || ''}
                      />
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                        prefix="₹"
                      />
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {formatCurrency(total)}
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
                          fontSize: '16px',
                          padding: '4px'
                        }}
                        title="Remove row"
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

        {/* Financial & Advance Summary */}
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
              label="Delivery Instructions / Notes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Deliver before 10 AM, contact packaging team..."
            />

            {orderType === 'ADVANCE' && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>
                  Initial Token Advance Payment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input
                    label="Advance Amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialAdvance}
                    onChange={(e) => setInitialAdvance(e.target.value)}
                    prefix="₹"
                  />
                  <Select
                    label="Method"
                    value={advanceMethod}
                    onChange={(e) => setAdvanceMethod(e.target.value)}
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'UPI', label: 'UPI' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                      { value: 'CHEQUE', label: 'Cheque' }
                    ]}
                  />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Input
                    label="Reference # / Transaction ID"
                    value={advanceRef}
                    onChange={(e) => setAdvanceRef(e.target.value)}
                    placeholder="e.g. UPI Ref / Cheque #"
                  />
                </div>
              </div>
            )}
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
              <span>Estimated Order Total:</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(estimatedTotal)}</span>
            </div>

            {orderType === 'ADVANCE' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Advance Token Received:</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(advanceAmount)}</span>
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
                  <span>Remaining Expected Balance:</span>
                  <span>{formatCurrency(remainingExpected)}</span>
                </div>
              </>
            )}

            <Button
              variant="primary"
              style={{ marginTop: '16px' }}
              onClick={handleSubmit}
              loading={submitting}
            >
              🚀 Book {orderType === 'ADVANCE' ? 'Advance' : 'Regular'} Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
