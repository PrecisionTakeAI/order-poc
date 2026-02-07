import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome section */}
      <div className="rounded-lg bg-white p-6 md:p-8 shadow">
        <h1 className="mb-4 text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
          Welcome back, {user?.fullName || user?.email}!
        </h1>
        <p className="text-sm md:text-base text-gray-600">Your one-stop shop for all cricket equipment and gear.</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-3">
        <Link
          to="/products"
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Browse Products</h3>
          <p className="mt-2 text-sm md:text-base text-gray-600">Explore our full range of cricket equipment.</p>
          <span className="mt-4 inline-block text-sm font-medium text-primary-600">
            View Products &rarr;
          </span>
        </Link>
        <Link
          to="/cart"
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Shopping Cart</h3>
          <p className="mt-2 text-sm md:text-base text-gray-600">Review items in your cart and checkout.</p>
          <span className="mt-4 inline-block text-sm font-medium text-primary-600">
            View Cart &rarr;
          </span>
        </Link>
        <Link
          to="/orders"
          className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">My Orders</h3>
          <p className="mt-2 text-sm md:text-base text-gray-600">Track and review your past orders.</p>
          <span className="mt-4 inline-block text-sm font-medium text-primary-600">
            View Orders &rarr;
          </span>
        </Link>
      </div>

      {/* Featured products placeholder */}
      <div className="rounded-lg bg-white p-6 md:p-8 shadow">
        <h2 className="mb-4 text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Featured Products</h2>
        <p className="text-sm md:text-base text-gray-600">Featured products will appear here soon.</p>
      </div>
    </div>
  );
};
