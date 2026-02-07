import React from 'react';
import { useParams } from 'react-router-dom';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Order Detail</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">Viewing order: {orderId}</p>
      </div>
    </div>
  );
};
