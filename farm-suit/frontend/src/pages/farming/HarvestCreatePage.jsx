import React, { useState, useEffect } from 'react';
import { farmingApi } from '../../api/farming';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const HarvestCreatePage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [batches, setBatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [harvestNumber, setHarvestNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('100.000');
  const [unitCost, setUnitCost] = useState('40.00');
  const [qualityGrade, setQualityGrade] = useState('GRADE_A');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const rand = Math.floor(100 + Math.random() * 900);
    setHarvestNumber(`HV-${new Date().getFullYear()}-${rand}`);

    farmingApi.getBatches().then(res => {
      if (res && res.data && res.data.batches) {
        setBatches(res.data.batches);
        if (res.data.batches.length > 0) setBatchId(String(res.data.batches[0].id));
      }
    }).catch(() => {});
  }, []);

  const totalCost = ((parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0));
  const selectedBatch = batches.find(b => String(b.id) === String(batchId));

  const handleSubmit = async (shouldPost = false) => {
    if (!harvestNumber.trim() || !batchId || !harvestDate) {
      setErrors({
        harvest_number: !harvestNumber.trim() ? ['Required'] : [],
        cultivation_batch_id: !batchId ? ['Required'] : [],
        harvest_date: !harvestDate ? ['Required'] : []
      });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        harvest_number: harvestNumber.trim().toUpperCase(),
        cultivation_batch_id: batchId,
        harvest_date: harvestDate,
        quantity,
        unit_cost: unitCost,
        quality_grade: qualityGrade,
        remarks
      };

      const res = await farmingApi.createHarvest(payload);
      const createdId = res.data.id;

      if (shouldPost) {
        await farmingApi.postHarvest(createdId);
        addToast(`Harvest ${harvestNumber} posted to Unified Inventory!`, 'success');
      } else {
        addToast(`Harvest ${harvestNumber} draft recorded!`, 'success');
      }

      onNavigate('/harvests');
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      addToast(err.message || 'Failed to record harvest', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Record Harvest Yield</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Record crop harvest output and credit farm produce into unified stock lots
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/harvests')}>
          ← Back to Harvests
        </Button>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Harvest Number"
              required
              value={harvestNumber}
              onChange={(e) => setHarvestNumber(e.target.value.toUpperCase())}
              placeholder="e.g. HV-2026-101"
              error={errors.harvest_number}
            />

            <Select
              label="Cultivation Batch & Crop"
              required
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              options={batches.map(b => ({ value: b.id, label: `${b.batch_number} — ${b.item?.name} (${b.farm_plot?.name})` }))}
              error={errors.cultivation_batch_id}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Harvest Date"
              type="date"
              required
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              error={errors.harvest_date}
            />

            <Select
              label="Quality Grade"
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
              options={[
                { value: 'GRADE_A', label: 'Grade A / Premium' },
                { value: 'GRADE_B', label: 'Grade B / Standard' },
                { value: 'GRADE_C', label: 'Grade C / Economy' }
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Yield Quantity"
              type="number"
              step="0.001"
              min="0.001"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              suffix={selectedBatch?.item?.unit || ''}
            />

            <Input
              label="Production Unit Cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              prefix="₹"
              helperText="Cost to produce 1 unit (seed, water, labor, fertilizer)"
            />
          </div>

          {/* Valuation Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginTop: '8px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Total Yield Valuation
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                {quantity} {selectedBatch?.item?.unit} @ ₹{unitCost}/unit
              </div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>
              {formatCurrency(totalCost)}
            </div>
          </div>

          <Input
            label="Harvest Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Morning harvest, optimal ripeness"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="ghost" onClick={() => onNavigate('/harvests')} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleSubmit(false)} loading={submitting}>
              💾 Save Draft
            </Button>
            <Button variant="primary" onClick={() => handleSubmit(true)} loading={submitting}>
              🚜 Post & Credit to Stock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
