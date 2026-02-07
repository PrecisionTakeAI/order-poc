import React from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
};
