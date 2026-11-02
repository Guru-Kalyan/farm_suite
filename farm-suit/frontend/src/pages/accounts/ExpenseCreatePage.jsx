import React, { useState } from 'react';
import { expensesApi } from '../../api/expenses';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../hooks/useToast';

const EXPENSE_TYPES = [
  { value: 'DEPARTMENT', label: 'Department Expenses' },
  { value: 'LABOUR', label: 'Labour Expenses' },
  { value: 'MEDICINE', label: 'Medicine Expenses' },
  { value: 'TOOLS', label: 'Tools Expenses' },
  { value: 'TRANSPORT', label: 'Transport Expenses' },
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
  { value: 'UPI', label: 'UPI / Online' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const ExpenseCreatePage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState('DEPARTMENT');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [payeeName, setPayeeName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = ['Expense title / purpose is required'];
    if (!amount || parseFloat(amount) <= 0) errs.amount = ['Please enter a valid amount greater than 0'];
    if (!expenseDate) errs.expense_date = ['Date is required'];
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (createAnother = false) => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        expense_date: expenseDate,
        expense_type: expenseType,
        title: title.trim(),
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        payee_name: payeeName.trim(),
        department_name: departmentName.trim(),
        reference_no: referenceNo.trim(),
        remarks: remarks.trim()
      };

      const res = await expensesApi.createExpense(payload);
      const voucher = res.data?.expense_number || 'Expenditure';
      addToast(`${voucher} recorded successfully!`, 'success');

      if (createAnother) {
        setTitle('');
        setAmount('');
        setPayeeName('');
        setReferenceNo('');
        setRemarks('');
        setErrors({});
      } else {
        if (onNavigate) onNavigate('/accounts/expenses');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save expenditure', 'error');
      if (err.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Record Expenditure</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Enter farm, labour, tools, medicine, and department operational expenses
          </p>
        </div>
        <Button variant="ghost" onClick={() => onNavigate && onNavigate('/accounts/expenses')}>
          ← Back to History
        </Button>
      </div>

      {/* Main Form Card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <Input
              label="Expenditure Date"
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              error={errors.expense_date?.[0]}
            />

            <Select
              label="Expense Category"
              required
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              options={EXPENSE_TYPES}
              error={errors.expense_type?.[0]}
            />

            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount?.[0]}
            />

            <Select
              label="Payment Mode"
              required
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={PAYMENT_MODES}
              error={errors.payment_mode?.[0]}
            />

            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Expense Title / Purpose"
                required
                placeholder="e.g. Drip Irrigation Repair, Monthly Field Labour, Pesticide Purchase"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title?.[0]}
              />
            </div>

            <Input
              label="Payee / Paid To"
              placeholder="e.g. Ramesh Kumar, Agrovet Agencies"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              error={errors.payee_name?.[0]}
            />

            {expenseType === 'DEPARTMENT' ? (
              <Input
                label="Department Name / Division"
                placeholder="e.g. Agronomy, Field Maintenance, Logistics"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                error={errors.department_name?.[0]}
              />
            ) : (
              <Input
                label="Department / Field Division (Optional)"
                placeholder="e.g. North Plot, Harvesting Crew"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
              />
            )}

            <Input
              label="Reference / Voucher / Bill #"
              placeholder="e.g. BILL-4412, NEFT-88902"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              error={errors.reference_no?.[0]}
            />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Remarks / Additional Notes
              </label>
              <textarea
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Enter any additional context, approval details, or notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => onNavigate && onNavigate('/accounts/expenses')}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => handleSave(true)}
            >
              Save & Create Another
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
            >
              Save Expenditure
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

