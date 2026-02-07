import React from 'react';

export const OrdersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">View your order history.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      </div>
    </div>
  );
};
