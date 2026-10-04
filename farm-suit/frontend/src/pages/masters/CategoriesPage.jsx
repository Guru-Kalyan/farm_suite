import React, { useState, useEffect, useCallback } from 'react';
import { mastersApi } from '../../api/masters';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Pagination } from '../../components/common/Pagination';
import { AuditTooltip } from '../../components/audit/AuditTooltip';
import { useToast } from '../../hooks/useToast';

export const CategoriesPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      const res = await mastersApi.getCategories(params);
      if (res && res.data) {
        setCategories(res.data.categories || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    fetchCategories(1);
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (editingCat) {
        await mastersApi.updateCategory(editingCat.id, { name: name.trim(), description: description.trim() });
        addToast('Category updated successfully', 'success');
      } else {
        await mastersApi.createCategory({ name: name.trim(), description: description.trim() });
        addToast('Category created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCategories(pagination ? pagination.page : 1);
    } catch (err) {
      setError(err.message || 'Failed to save category');
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Category Name',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>{val}</span>
          <AuditTooltip model="ItemCategory" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val || '—'}</span>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Product Categories</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Classification categories (Fruit, Grain, Flower, Vegetable, etc.)
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Category
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." />
      </div>

      <DataTable columns={columns} data={categories} loading={loading} emptyMessage="No categories found." />
      <Pagination pagination={pagination} onPageChange={fetchCategories} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCat ? `Edit Category — ${editingCat.name}` : 'Create Category'}
        maxWidth="440px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>Save</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Category Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vegetables, Grains"
            error={error}
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </form>
      </Modal>
    </div>
  );
};
