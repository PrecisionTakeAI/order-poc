import React from 'react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">Manage products, orders, and users.</p>
      </div>
    </div>
  );
};
