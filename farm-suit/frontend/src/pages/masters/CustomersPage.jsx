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

export const CustomersPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer_code: '',
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      const res = await mastersApi.getCustomers(params);
      if (res && res.data) {
        setCustomers(res.data.customers || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      customer_code: '',
      customer_name: '',
      phone: '',
      email: '',
      address: '',
      gst_number: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      gst_number: customer.gst_number || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingCustomer) {
        await mastersApi.updateCustomer(editingCustomer.id, formData);
        addToast('Customer updated successfully', 'success');
      } else {
        await mastersApi.createCustomer(formData);
        addToast('Customer created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCustomers(pagination ? pagination.page : 1);
    } catch (err) {
      if (err.errors) setFormErrors(err.errors);
      addToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'customer_code',
      header: 'Code',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{val}</span>
          <AuditTooltip model="Customer" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'customer_name',
      header: 'Customer Name',
      render: (val) => <span style={{ fontWeight: '600' }}>{val}</span>
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (val) => val || '—'
    },
    {
      key: 'gst_number',
      header: 'GSTIN',
      render: (val) => val ? <span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>{val}</span> : <span style={{ color: 'var(--text-muted)' }}>Unregistered</span>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Customers Directory</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Wholesale, retail, and commercial agricultural buyers
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Customer
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, code, or phone..." />
      </div>

      <DataTable columns={columns} data={customers} loading={loading} emptyMessage="No customers found." />
      <Pagination pagination={pagination} onPageChange={fetchCustomers} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer — ${editingCustomer.customer_name}` : 'Create Customer'}
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>Save Customer</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Input
              label="Customer Code"
              required
              disabled={Boolean(editingCustomer)}
              value={formData.customer_code}
              onChange={(e) => setFormData({ ...formData, customer_code: e.target.value.toUpperCase() })}
              placeholder="e.g. CUST-001"
              error={formErrors.customer_code}
            />
            <Input
              label="Customer Name"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="e.g. ABC Supermarket"
              error={formErrors.customer_name}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9123456789"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="billing@customer.com"
            />
          </div>

          <Input
            label="GST Number"
            value={formData.gst_number}
            onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
            placeholder="GSTIN registration (optional)"
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Billing / Delivery address"
          />
        </form>
      </Modal>
    </div>
  );
};
