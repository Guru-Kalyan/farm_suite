import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  confirmVariant = 'danger', // 'danger' | 'primary'
  requireReason = false,
  reasonPlaceholder = 'Please enter a reason...',
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for this operation');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="460px"
      footer={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: requireReason ? '16px' : '0' }}>
        {message}
      </div>

      {requireReason && (
        <Input
          label="Reason / Remarks"
          required
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(''); }}
          placeholder={reasonPlaceholder}
          error={error}
        />
      )}
    </Modal>
  );
};
