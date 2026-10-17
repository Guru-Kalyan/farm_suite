import React, { useState, useEffect } from 'react';
import { purchasesApi } from '../../api/purchases';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const PurchaseCreatePage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [discount, setDiscount] = useState('0.00');
  const [transportCost, setTransportCost] = useState('0.00');
  const [packagingCost, setPackagingCost] = useState('0.00');
  const [otherProcurementCosts, setOtherProcurementCosts] = useState('0.00');
  const [remarks, setRemarks] = useState('');

  const [lines, setLines] = useState([
    { item_id: '', quantity: '100', unit_rate: '50', remarks: '' }
  ]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Generate suggested bill number
    const rand = Math.floor(1000 + Math.random() * 9000);
    setBillNumber(`PB-${new Date().getFullYear()}-${rand}`);

    mastersApi.getVendors().then(res => {
      if (res && res.data && res.data.vendors) {
        setVendors(res.data.vendors);
        if (res.data.vendors.length > 0) setVendorId(String(res.data.vendors[0].id));
      }
    }).catch(() => {});

    mastersApi.getItems().then(res => {
      if (res && res.data && res.data.items) {
        setItems(res.data.items);
        if (res.data.items.length > 0) {
          setLines([{ item_id: String(res.data.items[0].id), quantity: '100', unit_rate: '50', remarks: '' }]);
        }
      }
    }).catch(() => {});
  }, []);

  const handleAddLine = () => {
    const defaultItemId = items.length > 0 ? String(items[0].id) : '';
    setLines([...lines, { item_id: defaultItemId, quantity: '1', unit_rate: '0', remarks: '' }]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length === 1) {
      addToast('A purchase bill must contain at least one line item', 'warning');
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, value) => {
    const updated = [...lines];
    updated[idx][field] = value;
    setLines(updated);
  };

  // Calculations for display (authoritative backend remains the final truth)
  const calculateSubtotal = () => {
    return lines.reduce((acc, line) => {
      const q = parseFloat(line.quantity) || 0;
      const r = parseFloat(line.unit_rate) || 0;
      return acc + (q * r);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const disc = parseFloat(discount) || 0;
  const transport = parseFloat(transportCost) || 0;
  const packaging = parseFloat(packagingCost) || 0;
  const otherProc = parseFloat(otherProcurementCosts) || 0;
  const grandTotal = Math.max(0, subtotal - disc);
  const totalLandedCost = Math.max(0, subtotal + transport + packaging + otherProc - disc);
  const additionalProcurementTotal = transport + packaging + otherProc;

  const handleSubmit = async (shouldPost = false) => {
    if (!vendorId) {
      setErrors({ vendor_id: ['Vendor is required'] });
      return;
    }
    if (!billNumber.trim()) {
      setErrors({ bill_number: ['Bill number is required'] });
      return;
    }

    const payload = {
      vendor_id: vendorId,
      bill_number: billNumber.trim(),
      bill_date: billDate,
      received_date: receivedDate,
      discount,
      transport_cost: transportCost,
      packaging_cost: packagingCost,
      other_procurement_costs: otherProcurementCosts,
      remarks,
      lines: lines.map(l => ({
        item_id: l.item_id,
        quantity: l.quantity,
        unit_rate: l.unit_rate,
        remarks: l.remarks
      }))
    };

    try {
      setSubmitting(true);
      setErrors({});

      const res = await purchasesApi.createPurchase(payload);
      const createdId = res.data.id;

      if (shouldPost) {
        await purchasesApi.postPurchase(createdId);
        addToast(`Purchase Bill ${billNumber} posted! Stock received into inventory with landed cost valuation.`, 'success');
      } else {
        addToast(`Purchase Bill ${billNumber} draft saved successfully.`, 'success');
      }

      onNavigate(`/purchases/${createdId}`);
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      addToast(err.message || 'Failed to save purchase bill', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Create Purchase Bill</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Record supplier procurement with landed cost tracking (transport, packaging, procurement fees)
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/purchases')}>
          ← Back to Purchases
        </Button>
      </div>

      {/* Bill Meta Card */}
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
          label="Vendor Supplier"
          required
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          options={vendors.map(v => ({ value: v.id, label: `${v.vendor_name} (${v.vendor_code})` }))}
          error={errors.vendor_id}
        />

        <Input
          label="Bill Number"
          required
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
          placeholder="e.g. PB-2026-001"
          error={errors.bill_number}
        />

        <Input
          label="Bill Date"
          type="date"
          required
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
        />

        <Input
          label="Received Date"
          type="date"
          required
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
          helperText="Date goods were received into warehouse"
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
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Procured Item Lines</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Procurement overheads will be allocated proportionally by value across items
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleAddLine}>
            + Add Another Item
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: '30%' }}>Item / Crop</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '15%' }}>Quantity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '15%' }}>Purchase Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '15%' }}>Base Amount (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', width: '20%' }}>Est. Landed Cost/Unit</th>
                <th style={{ padding: '10px 12px', width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qty = parseFloat(line.quantity) || 0;
                const rate = parseFloat(line.unit_rate) || 0;
                const lineAmount = qty * rate;
                const selectedItem = items.find(it => String(it.id) === String(line.item_id));

                // Proportional landed cost estimation for preview
                let estLandedUnitCost = rate;
                if (subtotal > 0 && qty > 0) {
                  const lineShare = lineAmount / subtotal;
                  const lineAllocated = lineShare * additionalProcurementTotal;
                  estLandedUnitCost = (lineAmount + lineAllocated) / qty;
                }

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
                        value={line.unit_rate}
                        onChange={(e) => handleLineChange(idx, 'unit_rate', e.target.value)}
                        prefix="₹"
                      />
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {formatCurrency(lineAmount)}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>
                      {formatCurrency(estLandedUnitCost)} / {selectedItem?.unit?.short_name || 'unit'}
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

        {/* Financial Summary & Actions Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                Procurement & Landed Overheads
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <Input
                  label="Transport Cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transportCost}
                  onChange={(e) => setTransportCost(e.target.value)}
                  prefix="₹"
                />
                <Input
                  label="Packaging Cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  prefix="₹"
                />
                <Input
                  label="Other Procurement"
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherProcurementCosts}
                  onChange={(e) => setOtherProcurementCosts(e.target.value)}
                  prefix="₹"
                />
              </div>
            </div>

            <Input
              label="Remarks / Delivery Notes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Received via Vehicle OD-02-1234 in good condition"
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
              <span>Base Subtotal:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
            </div>

            <Input
              label="Discount"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              prefix="₹"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Vendor Invoice Total:</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(grandTotal)}</span>
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
              <span>Total Landed Valuation:</span>
              <span>{formatCurrency(totalLandedCost)}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Includes base price + ₹{transport.toFixed(2)} transport + ₹{packaging.toFixed(2)} packaging + ₹{otherProc.toFixed(2)} other procurement.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={() => handleSubmit(false)}
                loading={submitting}
              >
                💾 Save as Draft
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => handleSubmit(true)}
                loading={submitting}
              >
                ✅ Post & Receive Stock
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

