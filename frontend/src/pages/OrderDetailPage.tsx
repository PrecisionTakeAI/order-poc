import React from 'react';
import { useParams } from 'react-router-dom';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Order Detail</h1>
      <p className="mt-2 text-gray-600">Viewing order: {orderId}</p>
    </div>
  );
};
