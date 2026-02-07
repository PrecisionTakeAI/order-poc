import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}

      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>

      {message && <p className="mb-6 max-w-sm text-sm text-gray-600">{message}</p>}

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} fullWidth={false} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
