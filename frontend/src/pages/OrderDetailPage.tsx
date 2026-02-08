import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  LoadingSpinner,
  EmptyState,
  Button,
  ProductImageDisplay,
} from '../components/common';
import { formatCurrency } from '../utils/format';
import type { OrderStatus } from '../types/order.types';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);

  // Status badge mapping
  const statusConfig: Record<
    OrderStatus,
    { variant: 'secondary' | 'info' | 'warning' | 'success' | 'error'; label: string }
  > = {
    pending: { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info', label: 'Confirmed' },
    processing: { variant: 'info', label: 'Processing' },
    shipped: { variant: 'secondary', label: 'Shipped' },
    delivered: { variant: 'success', label: 'Delivered' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  };

  // Format date nicely
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Truncate order ID to 8 characters and uppercase
  const displayOrderId = orderId ? orderId.substring(0, 8).toUpperCase() : '';

  // Calculate subtotal from items
  const calculatedSubtotal = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [order]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
        <p className="text-center text-gray-600">Loading order details...</p>
      </div>
    );
  }

  // Error state - 404 or 403
  if (error || !order) {
    const is403 = error?.includes('403') || error?.includes('Access Denied');
    const is404 = error?.includes('404') || error?.includes('not found');

    return (
      <div className="space-y-6">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
          title={is403 ? 'Access Denied' : is404 ? 'Order Not Found' : 'Error Loading Order'}
          message={
            is403
              ? 'You do not have permission to view this order.'
              : is404
              ? 'The order you are looking for does not exist.'
              : error || 'Unable to load order details. Please try again.'
          }
          actionLabel="Back to Order History"
          onAction={() => navigate('/orders')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/orders"
          className="text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
        >
          Order History
        </Link>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-600">Order Details</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Order #{displayOrderId}
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusConfig[order.status].variant} size="lg">
          {statusConfig[order.status].label}
        </Badge>
      </div>

      {/* Order Items Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Order Items</h2>
        </CardHeader>
        <CardBody>
          {/* Desktop: Table-like layout */}
          <div className="hidden md:block">
            <div className="border-b border-gray-200 pb-3 mb-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>
            </div>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6 flex items-center gap-4">
                    <ProductImageDisplay
                      imageUrl={item.product?.imageUrl}
                      alt={item.name || item.productName || 'Product'}
                      className="w-16 h-16 flex-shrink-0"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.name || item.productName}</p>
                      <p className="text-sm text-gray-600">ID: {item.productId.substring(0, 8)}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-gray-900">{item.quantity}</div>
                  <div className="col-span-2 text-right text-gray-900">
                    {formatCurrency(item.price)}
                  </div>
                  <div className="col-span-2 text-right font-semibold text-gray-900">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Stacked cards */}
          <div className="md:hidden space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex gap-4 mb-3">
                  <ProductImageDisplay
                    imageUrl={item.product?.imageUrl}
                    alt={item.name || item.productName || 'Product'}
                    className="w-20 h-20 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name || item.productName}</p>
                    <p className="text-sm text-gray-600">ID: {item.productId.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-gray-900">{item.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-medium text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Two column layout for Summary and Shipping Address */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Summary Section */}
        <Card>
          <CardHeader>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Order Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{formatCurrency(calculatedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">Shipping:</span>
                <span className="text-green-600 font-medium">
                  {order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">
                  {order.tax === 0 ? 'Included' : formatCurrency(order.tax)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-base md:text-lg">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Shipping Address Section */}
        <Card>
          <CardHeader>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Shipping Address</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm md:text-base">
              <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
              <p className="text-gray-700">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p className="text-gray-700">{order.shippingAddress.addressLine2}</p>
              )}
              <p className="text-gray-700">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-gray-700">{order.shippingAddress.country}</p>
              <p className="text-gray-700 pt-2">
                <span className="text-gray-600">Phone: </span>
                {order.shippingAddress.phoneNumber}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/orders')}
          fullWidth={false}
          size="md"
          className="sm:w-auto w-full"
        >
          Back to Order History
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/products')}
          fullWidth={false}
          size="md"
          className="sm:w-auto w-full"
        >
          Continue Shopping
        </Button>
      </div>
    </div>
  );
};
