import React from 'react';
import { Card } from './Card';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="animate-pulse">
      {/* Image Skeleton */}
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-gray-200" />

      {/* Product Info Skeleton */}
      <div className="space-y-2">
        {/* Product Name */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-5 w-1/2 rounded bg-gray-200" />

        {/* Star Rating */}
        <div className="h-4 w-24 rounded bg-gray-200" />

        {/* Price and Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
          <div className="h-6 w-20 rounded bg-gray-200" />
          <div className="h-9 w-full sm:w-28 rounded bg-gray-200" />
        </div>
      </div>
    </Card>
  );
};
