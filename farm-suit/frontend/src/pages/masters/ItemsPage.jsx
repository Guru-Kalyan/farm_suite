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

export const ItemsPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category_id: '',
    unit_id: '',
    minimum_stock: '0',
    description: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;

      const res = await mastersApi.getItems(params);
      if (res && res.data) {
        setItems(res.data.items || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, addToast]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  useEffect(() => {
    // Load category and unit dropdown choices
    mastersApi.getCategories().then(res => {
      if (res && res.data) setCategories(res.data.categories || []);
    }).catch(() => {});

    mastersApi.getUnits().then(res => {
      if (res && res.data) setUnits(res.data.units || []);
    }).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      item_code: '',
      name: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      unit_id: units.length > 0 ? String(units[0].id) : '',
      minimum_stock: '0',
      description: '',
      is_active: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      name: item.name,
      category_id: String(item.category.id),
      unit_id: String(item.unit.id),
      minimum_stock: item.minimum_stock,
      description: item.description || '',
      is_active: item.is_active
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingItem) {
        await mastersApi.updateItem(editingItem.id, formData);
        addToast('Item updated successfully', 'success');
      } else {
        await mastersApi.createItem(formData);
        addToast('Item created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchItems(pagination ? pagination.page : 1);
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      }
      addToast(err.message || 'Failed to save item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'item_code',
      header: 'Code',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{val}</span>
          <AuditTooltip model="Item" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'name',
      header: 'Item Name',
      render: (val) => <span style={{ fontWeight: '600' }}>{val}</span>
    },
    {
      key: 'category',
      header: 'Category',
      render: (val) => (
        <span style={{
          backgroundColor: 'var(--bg-surface-secondary)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11.5px',
          border: '1px solid var(--border-subtle)'
        }}>
          {val?.name}
        </span>
      )
    },
    {
      key: 'current_stock',
      header: 'Available Stock',
      render: (val, row) => (
        <div>
          <span style={{
            fontWeight: '700',
            color: row.is_low_stock ? 'var(--danger)' : 'var(--text-primary)'
          }}>
            {val} {row.unit?.short_name}
          </span>
          {row.is_low_stock && (
            <span style={{
              marginLeft: '6px',
              fontSize: '10.5px',
              color: 'var(--danger)',
              backgroundColor: 'var(--danger-subtle)',
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              Low
            </span>
          )}
        </div>
      )
    },
    {
      key: 'minimum_stock',
      header: 'Min Threshold',
      render: (val, row) => <span style={{ color: 'var(--text-muted)' }}>{val} {row.unit?.short_name}</span>
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => (
        <span style={{
          color: val ? 'var(--success)' : 'var(--text-muted)',
          fontWeight: '600',
          fontSize: '12px'
        }}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
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
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Items Master Catalog</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Manage master crops, produce, products, and minimum stock alerts
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add New Item
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        flexWrap: 'wrap'
      }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code or name..."
        />
        <div style={{ width: '200px' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Data Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No items found matching the selected criteria."
      />

      <Pagination pagination={pagination} onPageChange={fetchItems} />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Item — ${editingItem.name}` : 'Create Master Item'}
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Item Code"
            name="item_code"
            required
            disabled={Boolean(editingItem)}
            value={formData.item_code}
            onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
            placeholder="e.g. MANGO-01"
            error={formErrors.item_code}
            helperText={editingItem ? "Item code cannot be changed once created" : "Unique identifier code"}
          />

          <Input
            label="Item Name"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Alphonso Mango"
            error={formErrors.name}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Category"
              name="category_id"
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              error={formErrors.category_id}
            />

            <Select
              label="Unit of Measure"
              name="unit_id"
              required
              value={formData.unit_id}
              onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
              options={units.map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
              error={formErrors.unit_id}
            />
          </div>

          <Input
            label="Minimum Stock Threshold"
            name="minimum_stock"
            type="number"
            step="0.001"
            min="0"
            value={formData.minimum_stock}
            onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
            helperText="Reorder alert will trigger if stock falls below this quantity"
            error={formErrors.minimum_stock}
          />

          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional specifications, variety, etc."
          />
        </form>
      </Modal>
    </div>
  );
};
