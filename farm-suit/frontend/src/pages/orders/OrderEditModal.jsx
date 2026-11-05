import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api/orders';
import { mastersApi } from '../../api/masters';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const OrderEditModal = ({ orderId, isOpen, onClose, onOrderUpdated }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState('ADVANCE');
  const [status, setStatus] = useState('');

  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);

  // Editable fields
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [advancePaid, setAdvancePaid] = useState('0.00');

  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrors({});

        const [custRes, itemsRes, orderRes] = await Promise.all([
          mastersApi.getCustomers(),
          mastersApi.getItems(),
          ordersApi.getOrder(orderId)
        ]);

        if (!isMounted) return;

        if (custRes?.data?.customers) setCustomers(custRes.data.customers);
        if (itemsRes?.data?.items) setItems(itemsRes.data.items);

        if (orderRes?.data) {
          const ord = orderRes.data;
          setOrderNumber(ord.order_number || '');
          setOrderType(ord.order_type || 'ADVANCE');
          setStatus(ord.status || 'PENDING');
          setCustomerId(String(ord.customer?.id || ''));
          setDeliveryDate(ord.delivery_date || ord.requested_delivery_date || '');
          setDeliveryAddress(ord.delivery_address || '');
          setDeliveryInstructions(ord.delivery_instructions || '');
          setNotes(ord.notes || '');
          setDiscount(String(ord.discount || '0.00'));
          setAdvancePaid(String(ord.advance_amount || '0.00'));

          if (ord.lines && ord.lines.length > 0) {
            setLines(ord.lines.map(l => ({
              item_id: String(l.item?.id || l.item_id || ''),
              quantity: String(l.quantity || '1'),
              unit_price: String(l.unit_rate || l.unit_price || '0'),
              notes: l.notes || ''
            })));
          } else {
            const firstItemId = itemsRes?.data?.items?.[0]?.id ? String(itemsRes.data.items[0].id) : '';
            setLines([{ item_id: firstItemId, quantity: '1', unit_price: '0', notes: '' }]);
          }
        }
      } catch (err) {
        addToast(err.message || 'Failed to load order details for editing', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId, addToast]);

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

  const calculateSubtotal = () => {
    return lines.reduce((acc, line) => {
      const q = parseFloat(line.quantity) || 0;
      const p = parseFloat(line.unit_price) || 0;
      return acc + (q * p);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const totalAmount = Math.max(0, subtotal - numDiscount);
  const numAdvancePaid = parseFloat(advancePaid) || 0;
  const remainingExpected = Math.max(0, totalAmount - numAdvancePaid);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const newErrors = {};

    if (!customerId) {
      newErrors.customer_id = ['Customer is required'];
    }
    if (!deliveryDate) {
      newErrors.delivery_date = ['Delivery date is required'];
    }
    if (!lines || lines.length === 0) {
      newErrors.lines = ['At least one line item is required'];
    } else {
      lines.forEach((l, idx) => {
        if (!l.item_id) newErrors[`item_${idx}`] = 'Item required';
        if (!l.quantity || parseFloat(l.quantity) <= 0) newErrors[`qty_${idx}`] = 'Qty > 0 required';
        if (l.unit_price === '' || parseFloat(l.unit_price) < 0) newErrors[`price_${idx}`] = 'Rate >= 0 required';
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please correct the validation errors before saving', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        customer_id: parseInt(customerId, 10),
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress.trim(),
        delivery_instructions: deliveryInstructions.trim(),
        notes: notes.trim(),
        discount: numDiscount.toFixed(2),
        items: lines.map(l => ({
          item_id: parseInt(l.item_id, 10),
          quantity: l.quantity,
          unit_rate: l.unit_price,
          notes: l.notes.trim()
        }))
      };

      const res = await ordersApi.updateOrder(orderId, payload);
      addToast(`Order '${orderNumber}' updated successfully!`, 'success');
      if (onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isClosed = status === 'DELIVERED' || status === 'CANCELLED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${orderType === 'ADVANCE' ? 'Advance ' : ''}Order: ${orderNumber}`}
      maxWidth="820px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={saving}
            disabled={loading || isClosed}
          >
            💾 Save Changes
          </Button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading order details...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isClosed && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              ⚠️ This order is marked as <b>{status}</b> and cannot be modified.
            </div>
          )}

          {/* Customer & Delivery Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Select
              label="Customer *"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={isClosed}
              error={errors.customer_id?.[0]}
              options={[
                { value: '', label: 'Select Customer...' },
                ...customers.map(c => ({
                  value: String(c.id),
                  label: `${c.customer_name || c.name || ''} (${c.customer_code || c.code || 'ID: ' + c.id})`
                }))
              ]}
            />

            <Input
              label="Delivery Date *"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              disabled={isClosed}
              error={errors.delivery_date?.[0]}
            />
          </div>

          {/* Delivery Address & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Input
              label="Delivery Address"
              placeholder="Delivery destination address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              disabled={isClosed}
            />

            <Input
              label="Delivery Instructions"
              placeholder="e.g. Unload at main warehouse / Call driver"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              disabled={isClosed}
            />
          </div>

          {/* Line Items Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>
                Order Items & Quantities
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLine}
                disabled={isClosed}
              >
                + Add Item
              </Button>
            </div>

            <div style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px' }}>Quantity</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Unit Rate (₹)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Line Total (₹)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const q = parseFloat(line.quantity) || 0;
                    const p = parseFloat(line.unit_price) || 0;
                    const lineTotal = (q * p).toFixed(2);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={line.item_id}
                            onChange={(e) => handleLineChange(idx, 'item_id', e.target.value)}
                            disabled={isClosed}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: errors[`item_${idx}`] ? '1px solid var(--danger)' : '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '13px'
                            }}
                          >
                            <option value="">Select Item...</option>
                            {items.map(it => (
                              <option key={it.id} value={String(it.id)}>
                                {it.name} ({it.unit?.short_name || 'Units'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            disabled={isClosed}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              textAlign: 'right',
                              borderRadius: 'var(--radius-sm)',
                              border: errors[`qty_${idx}`] ? '1px solid var(--danger)' : '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                            disabled={isClosed}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              textAlign: 'right',
                              borderRadius: 'var(--radius-sm)',
                              border: errors[`price_${idx}`] ? '1px solid var(--danger)' : '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                          {formatCurrency(lineTotal)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isClosed || lines.length <= 1}
                            onClick={() => handleRemoveLine(idx)}
                            style={{ color: 'var(--danger)', padding: '2px 6px' }}
                            title="Remove Line"
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Items Subtotal
              </span>
              <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '2px' }}>
                {formatCurrency(subtotal)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Discount (₹)
              </span>
              <div style={{ marginTop: '2px' }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  disabled={isClosed}
                  style={{
                    width: '90px',
                    padding: '3px 6px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Revised Total
              </span>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>
                {formatCurrency(totalAmount)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Advances Paid
              </span>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>
                {formatCurrency(numAdvancePaid)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                Remaining Balance
              </span>
              <div style={{ fontSize: '15px', fontWeight: '800', color: remainingExpected > 0 ? 'var(--warning)' : 'var(--text-muted)', marginTop: '2px' }}>
                {formatCurrency(remainingExpected)}
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <Input
            label="Internal Notes / Remarks"
            placeholder="Special instructions, delivery terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isClosed}
          />
        </form>
      )}
    </Modal>
  );
};

