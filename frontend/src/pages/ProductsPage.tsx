import React from 'react';

export const ProductsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Products</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">Browse our cricket equipment collection.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      </div>
    </div>
  );
};
