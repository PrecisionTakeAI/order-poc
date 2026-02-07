import React from 'react';
import { useParams } from 'react-router-dom';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Product Detail</h1>
      <p className="mt-2 text-gray-600">Viewing product: {productId}</p>
    </div>
  );
};
