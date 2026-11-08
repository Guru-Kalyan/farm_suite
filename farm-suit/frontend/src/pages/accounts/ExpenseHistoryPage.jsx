import React, { useState, useEffect, useCallback } from 'react';
import { expensesApi } from '../../api/expenses';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { KpiCard } from '../../components/common/KpiCard';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ExpenseEditModal } from '../../components/accounts/ExpenseEditModal';

const EXPENSE_TYPES = [
  { value: '', label: 'All Categories' },
  { value: 'DEPARTMENT', label: 'Department Expenses' },
  { value: 'LABOUR', label: 'Labour Expenses' },
  { value: 'MEDICINE', label: 'Medicine Expenses' },
  { value: 'TOOLS', label: 'Tools Expenses' },
  { value: 'TRANSPORT', label: 'Transport Expenses' },
  { value: 'FUEL', label: 'Fuel Expenses' },
];

const CATEGORY_COLORS = {
  DEPARTMENT: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' },
  LABOUR: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },
  MEDICINE: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
  TOOLS: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' },
  TRANSPORT: { bg: 'rgba(236, 72, 153, 0.12)', text: '#db2777', border: 'rgba(236, 72, 153, 0.3)' },
  FUEL: { bg: 'rgba(249, 115, 22, 0.12)', text: '#ea580c', border: 'rgba(249, 115, 22, 0.3)' },
};

export const ExpenseHistoryPage = ({ onNavigate }) => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_amount: '0.00',
    total_count: 0,
    category_breakdown: { DEPARTMENT: '0.00', LABOUR: '0.00', MEDICINE: '0.00', TOOLS: '0.00', TRANSPORT: '0.00', FUEL: '0.00' }
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState('');
  const [search, setSearch] = useState('');
  const [activePreset, setActivePreset] = useState('month');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({ total_records: 0, total_pages: 1 });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Preset Date Handlers
  const handlePreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'week') {
      const start = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), qMonth, 1);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
    setPage(1);
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        start_date: fromDate,
        end_date: toDate,
        expense_type: expenseType,
        search
      };
      const res = await expensesApi.getExpenses(params);
      if (res && res.data) {
        setExpenses(res.data.expenses || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch expenditures', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, fromDate, toDate, expenseType, search, addToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await expensesApi.deleteExpense(deleteTarget.id);
      addToast(`Expenditure ${deleteTarget.expense_number} deleted successfully`, 'success');
      setDeleteTarget(null);
      fetchExpenses();
    } catch (err) {
      addToast(err.message || 'Failed to delete expenditure', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'expense_date',
      header: 'Date',
      width: '110px',
      render: (val) => formatDate(val)
    },
    {
      key: 'expense_number',
      header: 'Voucher #',
      width: '130px',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>
          {val}
        </span>
      )
    },
    {
      key: 'expense_type',
      header: 'Category',
      width: '160px',
      render: (val, row) => {
        const style = CATEGORY_COLORS[val] || { bg: 'var(--bg-surface-secondary)', text: 'var(--text-primary)', border: 'var(--border-subtle)' };
        return (
          <span style={{
            display: 'inline-block',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11.5px',
            fontWeight: '600',
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}>
            {row.expense_type_display || val}
          </span>
        );
      }
    },
    {
      key: 'title',
      header: 'Purpose / Title',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{val}</div>
          {row.payee_name && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Paid to: <span style={{ fontWeight: '500' }}>{row.payee_name}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '120px',
      render: (val) => (
        <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
          {formatCurrency(val)}
        </span>
      )
    },
    {
      key: 'payment_mode',
      header: 'Payment Mode',
      width: '140px',
      render: (val, row) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          {row.payment_mode_display || val}
        </span>
      )
    },
    {
      key: 'department_name',
      header: 'Division / Ref',
      width: '150px',
      render: (_, row) => (
        <div style={{ fontSize: '12px' }}>
          {row.department_name && <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{row.department_name}</div>}
          {row.reference_no && <div style={{ color: 'var(--text-muted)' }}>Ref: {row.reference_no}</div>}
          {!row.department_name && !row.reference_no && <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </div>
      )
    },
    {
      key: 'created_by',
      header: 'Created By',
      width: '120px',
      render: (val) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{val || '—'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {hasPermission('expenses.edit') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingExpense(row)}
              title="Edit Expenditure"
            >
              ✏️ Edit
            </Button>
          )}
          {hasPermission('expenses.delete') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              style={{ color: 'var(--danger)' }}
              title="Delete Expenditure"
            >
              🗑️ Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Expenditure History & Analytics</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Track and audit department, labour, tools, medicine, and transport operational disbursements
          </p>
        </div>

        {hasPermission('expenses.create') && (
          <Button variant="primary" onClick={() => onNavigate && onNavigate('/accounts/expenses/create')}>
            + Record Expenditure
          </Button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard
          title="Period Expenditure"
          value={formatCurrency(summary.total_amount)}
          subtitle={`${summary.total_count} transactions recorded`}
          icon="💸"
          variant="primary"
        />
        <KpiCard
          title="Department Expenses"
          value={formatCurrency(summary.category_breakdown?.DEPARTMENT || '0')}
          icon="🏢"
        />
        <KpiCard
          title="Labour Expenses"
          value={formatCurrency(summary.category_breakdown?.LABOUR || '0')}
          icon="👷"
        />
        <KpiCard
          title="Medicine Expenses"
          value={formatCurrency(summary.category_breakdown?.MEDICINE || '0')}
          icon="💊"
        />
        <KpiCard
          title="Tools Expenses"
          value={formatCurrency(summary.category_breakdown?.TOOLS || '0')}
          icon="🔧"
        />
        <KpiCard
          title="Transport Expenses"
          value={formatCurrency(summary.category_breakdown?.TRANSPORT || '0')}
          icon="🚚"
        />
        <KpiCard
          title="Fuel Expenses"
          value={formatCurrency(summary.category_breakdown?.FUEL || '0')}
          icon="⛽"
        />
      </div>

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Quick Date Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '4px' }}>
            Range Presets:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'all', label: 'All Time' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset.id)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: activePreset === preset.id ? '700' : '500',
                borderRadius: 'var(--radius-sm)',
                border: activePreset === preset.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                backgroundColor: activePreset === preset.id ? 'var(--primary-subtle)' : 'var(--bg-app)',
                color: activePreset === preset.id ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Inputs Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
          <Input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setActivePreset('custom'); setPage(1); }}
          />
          <Input
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setActivePreset('custom'); setPage(1); }}
          />
          <Select
            label="Expense Category"
            value={expenseType}
            onChange={(e) => { setExpenseType(e.target.value); setPage(1); }}
            options={EXPENSE_TYPES}
          />
          <Input
            label="Search"
            placeholder="Search voucher, payee, title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Main Expenditure Table */}
      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        emptyMessage="No expenditure entries found for the selected range and filters."
        pagination={{
          page,
          pageSize,
          totalRecords: pagination.total_records,
          totalPages: pagination.total_pages,
          onPageChange: (newPage) => setPage(newPage),
          onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(1); }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title={`Delete Expenditure: ${deleteTarget.expense_number}?`}
          message={`Are you sure you want to delete expenditure "${deleteTarget.title}" amounting to ${formatCurrency(deleteTarget.amount)}? This action cannot be undone.`}
          confirmText="Delete Expenditure"
          confirmVariant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

