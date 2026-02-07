import React from 'react';
import { useCart } from '../../hooks/useCart';

export const CartSyncIndicator: React.FC = () => {
  const { syncStatus, isOnline, retrySync } = useCart();

  // Show nothing when synced and online
  if (syncStatus === 'synced' && isOnline) {
    return null;
  }

  // Show offline warning
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-xs font-medium">Offline</span>
      </div>
    );
  }

  // Show pending spinner
  if (syncStatus === 'pending') {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <svg
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-xs font-medium">Syncing...</span>
      </div>
    );
  }

  // Show error icon with retry button
  if (syncStatus === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <button
          onClick={retrySync}
          className="text-xs font-medium underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
};
