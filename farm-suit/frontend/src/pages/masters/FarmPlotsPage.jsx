import React, { useState, useEffect, useCallback } from 'react';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { useToast } from '../../hooks/useToast';

export const FarmPlotsPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [plots, setPlots] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    area: '',
    area_unit: 'Acre',
    description: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchPlots = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      const res = await mastersApi.getFarmPlots(params);
      if (res && res.data) {
        setPlots(res.data.plots || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load farm plots', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    fetchPlots(1);
  }, [fetchPlots]);

  const handleOpenCreate = () => {
    setEditingPlot(null);
    setFormData({
      name: '',
      location: '',
      area: '',
      area_unit: 'Acre',
      description: '',
      is_active: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plot) => {
    setEditingPlot(plot);
    setFormData({
      name: plot.name,
      location: plot.location || '',
      area: plot.area,
      area_unit: plot.area_unit || 'Acre',
      description: plot.description || '',
      is_active: plot.is_active
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingPlot) {
        await mastersApi.updateFarmPlot(editingPlot.id, formData);
        addToast('Farm plot updated successfully', 'success');
      } else {
        await mastersApi.createFarmPlot(formData);
        addToast('Farm plot created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchPlots(pagination ? pagination.page : 1);
    } catch (err) {
      if (err.errors) setFormErrors(err.errors);
      addToast(err.message || 'Failed to save farm plot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Plot Name',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>{val}</span>
          <AuditTooltip model="FarmPlot" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location / Sector',
      render: (val) => val || '—'
    },
    {
      key: 'area',
      header: 'Total Area',
      render: (val, row) => (
        <span style={{
          backgroundColor: 'var(--primary-subtle)',
          color: 'var(--primary-text)',
          fontWeight: '700',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {val} {row.area_unit}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => <span style={{ color: val ? 'var(--success)' : 'var(--text-muted)' }}>{val ? 'Active' : 'Inactive'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
          ✏️ Edit
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Farm Plots & Land Management</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            In-house cultivation sectors, fields, and acreage
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Farm Plot
        </Button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by plot name or location..." />
      </div>

      <DataTable columns={columns} data={plots} loading={loading} emptyMessage="No farm plots found." />
      <Pagination pagination={pagination} onPageChange={fetchPlots} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlot ? `Edit Plot — ${editingPlot.name}` : 'Create Farm Plot'}
        maxWidth="460px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>Save Plot</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Plot Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. North Orchard Plot A"
            error={formErrors.name}
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Sector 4, Riverfront"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <Input
              label="Area"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="e.g. 5.5"
              error={formErrors.area}
            />
            <Select
              label="Area Unit"
              value={formData.area_unit}
              onChange={(e) => setFormData({ ...formData, area_unit: e.target.value })}
              options={['Acre', 'Hectare', 'Bigha', 'Guntha', 'Sq Ft']}
            />
          </div>

          <Input
            label="Description / Soil Profile"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. Drip irrigated black cotton soil"
          />
        </form>
      </Modal>
    </div>
  );
};
