import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { OrderCard, OrderCardSkeleton, EmptyState, Button } from '../components/common';
import type { OrderStatus } from '../types/order.types';

const ORDERS_PER_PAGE = 10;

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, loading, count, hasMore, lastKey, fetchOrders } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortNewest, setSortNewest] = useState(true);

  // Fetch orders on mount and when status filter changes
  useEffect(() => {
    fetchOrders(ORDERS_PER_PAGE, statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, fetchOrders]);

  // Sort orders client-side based on createdAt
  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    if (sortNewest) {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  }, [orders, sortNewest]);

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleLoadMore = () => {
    if (hasMore && lastKey) {
      fetchOrders(ORDERS_PER_PAGE, statusFilter === 'all' ? undefined : statusFilter, lastKey, true);
    }
  };

  const handleStartShopping = () => {
    navigate('/products');
  };

  // Status filter options
  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Loading state - show skeleton grid
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Track and manage your orders.
          </p>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 w-full sm:w-48 rounded bg-gray-200 animate-pulse" />
          <div className="h-10 w-full sm:w-40 rounded bg-gray-200 animate-pulse" />
        </div>

        {/* Order Grid Skeleton */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          aria-label="Loading orders"
          aria-live="polite"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no orders
  if (!loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Track and manage your orders.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm md:text-base"
            aria-label="Filter orders by status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Empty State */}
        <EmptyState
          icon={
            <svg
              className="h-16 w-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          }
          title={statusFilter !== 'all' ? 'No orders found' : 'No orders yet'}
          message={
            statusFilter !== 'all'
              ? `You don't have any ${statusFilter} orders.`
              : "You haven't placed any orders yet. Start shopping to see your orders here."
          }
          actionLabel={statusFilter === 'all' ? 'Start Shopping' : undefined}
          onAction={statusFilter === 'all' ? handleStartShopping : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            {count} {count === 1 ? 'order' : 'orders'}
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm md:text-base"
          aria-label="Filter orders by status"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Sort Toggle */}
        <button
          type="button"
          onClick={() => setSortNewest(!sortNewest)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 text-sm md:text-base font-medium text-gray-700 transition-colors"
          aria-label={`Sort by ${sortNewest ? 'oldest first' : 'newest first'}`}
        >
          <svg
            className={`h-5 w-5 transition-transform ${sortNewest ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          {sortNewest ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* Order Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        aria-label="Order list"
      >
        {sortedOrders.map((order) => (
          <OrderCard
            key={order.orderId}
            orderId={order.orderId}
            date={order.createdAt}
            total={order.total}
            status={order.status as OrderStatus}
            itemCount={order.items.length}
            onClick={handleOrderClick}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loading}
            fullWidth={false}
            size="md"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};
