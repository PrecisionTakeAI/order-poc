import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const adminCards = [
    {
      title: 'Manage Products',
      description: 'Create, edit, and manage your product catalog',
      icon: (
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      onClick: () => navigate('/admin/products'),
    },
    {
      title: 'Manage Orders',
      description: 'View and manage customer orders',
      icon: (
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      onClick: () => navigate('/orders'),
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: (
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      onClick: () => {},
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">
          Manage products, orders, and users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={card.onClick}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
