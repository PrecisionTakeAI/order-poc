import React from 'react';
import { useParams } from 'react-router-dom';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Product Detail</h1>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1">
          <p className="text-sm md:text-base text-gray-600">Viewing product: {productId}</p>
        </div>
      </div>
    </div>
  );
};
