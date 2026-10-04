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

export const VendorsPage = ({ onOpenAudit }) => {
  const { addToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchVendors = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      const res = await mastersApi.getVendors(params);
      if (res && res.data) {
        setVendors(res.data.vendors || []);
        setPagination(res.data.pagination || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    fetchVendors(1);
  }, [fetchVendors]);

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      vendor_code: '',
      vendor_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingVendor) {
        await mastersApi.updateVendor(editingVendor.id, formData);
        addToast('Vendor updated successfully', 'success');
      } else {
        await mastersApi.createVendor(formData);
        addToast('Vendor created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchVendors(pagination ? pagination.page : 1);
    } catch (err) {
      if (err.errors) setFormErrors(err.errors);
      addToast(err.message || 'Failed to save vendor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'vendor_code',
      header: 'Code',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{val}</span>
          <AuditTooltip model="Vendor" id={row.id} onOpenTimeline={onOpenAudit} />
        </div>
      )
    },
    {
      key: 'vendor_name',
      header: 'Vendor Name',
      render: (val) => <span style={{ fontWeight: '600' }}>{val}</span>
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (val, row) => (
        <div>
          <div>{val || '—'}</div>
          {row.contact_person && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.contact_person}</div>}
        </div>
      )
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>External Vendors Directory</h1>
          <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Suppliers and growers for indirect trading procurements
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Vendor
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

      <DataTable columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found." />
      <Pagination pagination={pagination} onPageChange={fetchVendors} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? `Edit Vendor — ${editingVendor.vendor_name}` : 'Create Vendor'}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>Save Vendor</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Input
              label="Vendor Code"
              required
              disabled={Boolean(editingVendor)}
              value={formData.vendor_code}
              onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value.toUpperCase() })}
              placeholder="e.g. VEND-001"
              error={formErrors.vendor_code}
            />
            <Input
              label="Vendor Name"
              required
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="e.g. Ratnagiri Mango Traders"
              error={formErrors.vendor_name}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Contact Person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="Representative name"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="vendor@company.com"
            />
            <Input
              label="GST Number"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
              placeholder="e.g. 21AAAAA0000A1Z5"
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Warehouse or office location"
          />
        </form>
      </Modal>
    </div>
  );
};
