import React, { useState, useEffect } from 'react';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { useToast } from '../../hooks/useToast';

export const UnitsPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await mastersApi.getUnits();
      if (res && res.data) {
        setUnits(res.data.units || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load units', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenCreate = () => {
    setName('');
    setShortName('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) {
      setError('Both name and short code are required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await mastersApi.createUnit({ name: name.trim(), short_name: shortName.trim() });
      addToast('Unit created successfully', 'success');
      setIsModalOpen(false);
      fetchUnits();
    } catch (err) {
      setError(err.message || 'Failed to create unit');
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Unit Name',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>{val}</span>
          <AuditTooltip model="UnitOfMeasure" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'short_name',
      header: 'Short Code / Symbol',
      render: (val) => (
        <span style={{
          backgroundColor: 'var(--primary-subtle)',
          color: 'var(--primary-text)',
          fontWeight: '700',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {val}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => <span style={{ color: val ? 'var(--success)' : 'var(--text-muted)' }}>{val ? 'Active' : 'Inactive'}</span>
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Units of Measure</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Measurement units for trading, stockkeeping, and harvest (Kg, Qtl, Ton, Box, etc.)
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Unit
        </Button>
      </div>

      <DataTable columns={columns} data={units} loading={loading} emptyMessage="No units defined." />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Unit of Measure"
        maxWidth="400px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>Create Unit</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Unit Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quintal, Box"
            error={error}
          />
          <Input
            label="Short Name / Symbol"
            required
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="e.g. Qtl, Box, Pcs"
          />
        </form>
      </Modal>
    </div>
  );
};
