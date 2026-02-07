import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={false}>
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>

        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose} fullWidth={false} size="sm">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} fullWidth={false} size="sm">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
