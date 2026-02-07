import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
      <p className="text-sm">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 flex-shrink-0 text-red-600 hover:text-red-800"
          aria-label="Dismiss error"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
