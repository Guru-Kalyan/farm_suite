import React, { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../../api/audit';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { SearchInput } from '../../components/common/SearchInput';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateTime } from '../../utils/formatters';

const ACTION_COLORS = {
  CREATE: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' },
  UPDATE: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
  POST: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)' },
  REVERSE: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' },
  DELETE: { bg: 'rgba(244, 63, 94, 0.12)', text: '#e11d48', border: 'rgba(244, 63, 94, 0.25)' },
};

export const AuditTrailPage = ({ onOpenAudit }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [pagination, setPagination] = useState({ total_items: 0, total_pages: 1 });
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      page_size: pageSize,
      search: search || undefined,
      model_name: modelFilter || undefined,
      action: actionFilter || undefined,
    };

    auditApi.getLogs(params)
      .then(res => {
        if (res && res.data) {
          setLogs(res.data.logs || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      })
      .catch(err => console.error("Error fetching audit logs:", err))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, modelFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setModelFilter('');
    setActionFilter('');
    setPage(1);
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      width: '160px',
      render: (row) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: 'User',
      accessor: 'user',
      width: '110px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>👤</span>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.user}</span>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      width: '110px',
      render: (row) => {
        const style = ACTION_COLORS[row.action] || { bg: 'var(--bg-surface-secondary)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' };
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}>
            {row.action}
          </span>
        );
      },
    },
    {
      header: 'Entity / Target',
      width: '180px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontWeight: '600',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '12px'
          }}>
            {row.model_name}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            #{row.object_id}
          </span>
          {onOpenAudit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAudit(row.model_name, row.object_id);
              }}
              title="View entity timeline"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '2px',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
            >
              🕒
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
          {row.description}
        </div>
      ),
    },
    {
      header: 'Diff / Details',
      width: '120px',
      align: 'right',
      render: (row) => {
        const hasDiff = row.changed_fields && row.changed_fields.length > 0;
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedEntry(row)}
            style={{ fontSize: '11.5px', padding: '4px 8px' }}
          >
            {hasDiff ? `Diff (${row.changed_fields.length})` : 'Inspect'}
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            System Audit Trail
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Append-only, immutable change logs across all business entities, transactions, and user operations.
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 240px' }}>
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Search description, entity ID, user..."
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Entities' },
              { value: 'Item', label: 'Item' },
              { value: 'ItemCategory', label: 'ItemCategory' },
              { value: 'UnitOfMeasure', label: 'UnitOfMeasure' },
              { value: 'Vendor', label: 'Vendor' },
              { value: 'Customer', label: 'Customer' },
              { value: 'FarmPlot', label: 'FarmPlot' },
              { value: 'PurchaseBill', label: 'PurchaseBill' },
              { value: 'CultivationBatch', label: 'CultivationBatch' },
              { value: 'Harvest', label: 'Harvest' },
              { value: 'InventoryLot', label: 'InventoryLot' },
              { value: 'SalesBill', label: 'SalesBill' },
            ]}
          />
        </div>

        <div style={{ width: '150px' }}>
          <Select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Actions' },
              { value: 'CREATE', label: 'CREATE' },
              { value: 'UPDATE', label: 'UPDATE' },
              { value: 'POST', label: 'POST' },
              { value: 'REVERSE', label: 'REVERSE' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
          />
        </div>

        {(search || modelFilter || actionFilter) && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table & Pagination */}
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs match your filter criteria."
      />

      <Pagination
        currentPage={page}
        totalPages={pagination.total_pages || 1}
        pageSize={pageSize}
        totalItems={pagination.total_items || 0}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
      />

      {/* Inspect / Diff Modal */}
      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title={`Audit Log #${selectedEntry.id}: ${selectedEntry.model_name} [${selectedEntry.action}]`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meta summary card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '14px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12.5px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Timestamp</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatDateTime(selectedEntry.timestamp)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>User</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedEntry.user}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Entity</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedEntry.model_name} #{selectedEntry.object_id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Action</span>
                <span style={{ fontWeight: '700', color: ACTION_COLORS[selectedEntry.action]?.text || 'var(--text-primary)' }}>{selectedEntry.action}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Description</span>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-primary)', fontSize: '13.5px' }}>
                {selectedEntry.description}
              </p>
            </div>

            {/* Changed fields diff */}
            {selectedEntry.changed_fields && selectedEntry.changed_fields.length > 0 ? (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Field Changes</span>
                <div style={{
                  marginTop: '8px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', width: '25%' }}>Field</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', width: '37.5%' }}>Old Value</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', width: '37.5%' }}>New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.changed_fields.map((f, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < selectedEntry.changed_fields.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>{f}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                            {JSON.stringify(selectedEntry.old_values?.[f] ?? null)}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--success)', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                            {JSON.stringify(selectedEntry.new_values?.[f] ?? null)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontSize: '12px'
              }}>
                No individual field diffs stored for this event (snapshot or action event).
              </div>
            )}

            {/* Raw JSON inspection toggle */}
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                View Raw Event JSON
              </summary>
              <pre style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: 'var(--bg-app)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                overflowX: 'auto',
                color: 'var(--text-primary)'
              }}>
                {JSON.stringify(selectedEntry, null, 2)}
              </pre>
            </details>
          </div>
        </Modal>
      )}
    </div>
  );
};
