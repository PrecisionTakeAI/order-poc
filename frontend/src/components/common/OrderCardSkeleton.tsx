import React from 'react';
import { Card } from './Card';

export const OrderCardSkeleton: React.FC = () => {
  return (
    <Card className="animate-pulse">
      {/* Card Header Skeleton */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-2 flex-1">
            {/* Order ID */}
            <div className="h-5 w-32 rounded bg-gray-200" />
            {/* Date */}
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          {/* Status Badge */}
          <div className="h-6 w-20 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Card Body Skeleton */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {/* Item count */}
            <div className="h-4 w-16 rounded bg-gray-200" />
            {/* Total amount */}
            <div className="h-6 w-20 rounded bg-gray-200" />
          </div>
          {/* Arrow icon */}
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
        </div>
      </div>
    </Card>
  );
};
