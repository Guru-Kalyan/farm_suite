import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { expensesApi } from '../../api/expenses';
import { useToast } from '../../hooks/useToast';

const EXPENSE_TYPES = [
  { value: 'DEPARTMENT', label: 'Department Expenses' },
  { value: 'LABOUR', label: 'Labour Expenses' },
  { value: 'MEDICINE', label: 'Medicine Expenses' },
  { value: 'TOOLS', label: 'Tools Expenses' },
  { value: 'TRANSPORT', label: 'Transport Expenses' },
  { value: 'FUEL', label: 'Fuel Expenses' },
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / Online' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const ExpenseEditModal = ({ isOpen, expense, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [expenseDate, setExpenseDate] = useState('');
  const [expenseType, setExpenseType] = useState('DEPARTMENT');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [payeeName, setPayeeName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (expense) {
      setExpenseDate(expense.expense_date || '');
      setExpenseType(expense.expense_type || 'DEPARTMENT');
      setTitle(expense.title || '');
      setAmount(expense.amount ? String(expense.amount) : '');
      setPaymentMode(expense.payment_mode || 'CASH');
      setPayeeName(expense.payee_name || '');
      setDepartmentName(expense.department_name || '');
      setReferenceNo(expense.reference_no || '');
      setRemarks(expense.remarks || '');
      setErrors({});
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!expenseDate) errs.expense_date = 'Expense date is required';
    if (!title.trim()) errs.title = 'Expense purpose / title is required';
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Amount must be greater than zero';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const payload = {
        expense_date: expenseDate,
        expense_type: expenseType,
        title: title.trim(),
        amount: parsedAmount,
        payment_mode: paymentMode,
        payee_name: payeeName.trim(),
        department_name: departmentName.trim(),
        reference_no: referenceNo.trim(),
        remarks: remarks.trim()
      };

      const res = await expensesApi.updateExpense(expense.id, payload);
      addToast(res?.message || `Expenditure ${expense.expense_number} updated successfully`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update expenditure', 'error');
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Expenditure Voucher: ${expense?.expense_number || ''}`}
      maxWidth="620px"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Expense Date"
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            error={errors.expense_date}
          />
          <Select
            label="Category"
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            options={EXPENSE_TYPES}
            error={errors.expense_type}
          />
        </div>

        <Input
          label="Title / Purpose"
          placeholder="e.g. Tractor Diesel 40L, Field Labour Payout"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
          />
          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={PAYMENT_MODES}
            error={errors.payment_mode}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Paid To / Payee"
            placeholder="e.g. Bharat Petroleum, Ramesh Kumar"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
          />
          <Input
            label="Division / Department"
            placeholder="e.g. Field Operations, Transport"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
          />
        </div>

        <Input
          label="Reference / Receipt #"
          placeholder="e.g. Bill #8492, UPI Ref #3849102"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />

        <Input
          label="Remarks / Notes"
          placeholder="Additional details regarding this expenditure"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </form>
    </Modal>
  );
};

