import React, { useState, useEffect } from 'react';
import { farmingApi } from '../../api/farming';
import { mastersApi } from '../../api/masters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../hooks/useToast';

export const CultivationCreatePage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [plots, setPlots] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [batchNumber, setBatchNumber] = useState('');
  const [itemId, setItemId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [area, setArea] = useState('1.00');
  const [cultivatedQty, setCultivatedQty] = useState('0');
  const [status, setStatus] = useState('ACTIVE');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const rand = Math.floor(100 + Math.random() * 900);
    setBatchNumber(`CB-${new Date().getFullYear()}-${rand}`);

    mastersApi.getItems().then(res => {
      if (res && res.data && res.data.items) {
        setItems(res.data.items);
        if (res.data.items.length > 0) setItemId(String(res.data.items[0].id));
      }
    }).catch(() => {});

    mastersApi.getFarmPlots().then(res => {
      if (res && res.data && res.data.plots) {
        setPlots(res.data.plots);
        if (res.data.plots.length > 0) {
          setPlotId(String(res.data.plots[0].id));
          setArea(String(res.data.plots[0].area));
        }
      }
    }).catch(() => {});
  }, []);

  const handlePlotChange = (newPlotId) => {
    setPlotId(newPlotId);
    const chosen = plots.find(p => String(p.id) === String(newPlotId));
    if (chosen) setArea(String(chosen.area));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batchNumber.trim() || !itemId || !plotId || !startDate) {
      setErrors({
        batch_number: !batchNumber.trim() ? ['Required'] : [],
        item_id: !itemId ? ['Required'] : [],
        farm_plot_id: !plotId ? ['Required'] : [],
        start_date: !startDate ? ['Required'] : []
      });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        batch_number: batchNumber.trim().toUpperCase(),
        item_id: itemId,
        farm_plot_id: plotId,
        start_date: startDate,
        expected_harvest_date: expectedHarvestDate || null,
        area,
        cultivated_quantity: cultivatedQty,
        status,
        remarks
      };

      await farmingApi.createBatch(payload);
      addToast(`Cultivation Batch ${batchNumber} scheduled successfully!`, 'success');
      onNavigate('/cultivation');
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      addToast(err.message || 'Failed to create batch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Schedule Cultivation Batch</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Initiate in-house direct farming crop on a dedicated plot
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate('/cultivation')}>
          ← Back to Batches
        </Button>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Batch Number"
              required
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
              placeholder="e.g. CB-2026-101"
              error={errors.batch_number}
            />

            <Select
              label="Crop / Agricultural Item"
              required
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              options={items.map(it => ({ value: it.id, label: `${it.name} (${it.unit?.short_name})` }))}
              error={errors.item_id}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Select
              label="Designated Farm Plot"
              required
              value={plotId}
              onChange={(e) => handlePlotChange(e.target.value)}
              options={plots.map(p => ({ value: p.id, label: `${p.name} (${p.area} ${p.area_unit})` }))}
              error={errors.farm_plot_id}
            />

            <Input
              label="Cultivated Area (Acres)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              error={errors.area}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Start Date / Sowing Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.start_date}
            />

            <Input
              label="Expected Harvest Date"
              type="date"
              value={expectedHarvestDate}
              onChange={(e) => setExpectedHarvestDate(e.target.value)}
              helperText="Estimated maturity date"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={['PLANNED', 'ACTIVE']}
            />

            <Input
              label="Initial Seed / Planting Quantity"
              type="number"
              step="0.001"
              min="0"
              value={cultivatedQty}
              onChange={(e) => setCultivatedQty(e.target.value)}
              placeholder="e.g. 50 (seeds/saplings)"
            />
          </div>

          <Input
            label="Remarks / Cultivation Plan"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Fertilizer schedule, variety, notes..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="ghost" onClick={() => onNavigate('/cultivation')} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              🌱 Create Cultivation Batch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
