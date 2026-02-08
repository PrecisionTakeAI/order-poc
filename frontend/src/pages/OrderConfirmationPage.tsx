import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '../hooks/useOrder';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/format';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);
  const { showToast } = useToast();

  useEffect(() => {
    if (error) {
      showToast('error', 'Failed to load order details');
      navigate('/orders');
    }
  }, [error, navigate, showToast]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const formatOrderId = (id: string) => id.substring(0, 8).toUpperCase();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'error' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Thank you for your purchase. Your order has been successfully placed.
        </p>
      </div>

      {/* Order Metadata */}
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-mono text-lg font-semibold text-gray-900">
              {formatOrderId(order.orderId)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-lg font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
          </div>
        </div>
      </Card>

      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Items List */}
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between border-b border-gray-100 pb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  {order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-semibold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Shipping Address Card */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Shipping Address</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-1 text-gray-700">
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </CardBody>
      </Card>

      {/* Order Status Card */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Current Status</span>
              <Badge variant={getStatusVariant(order.status)} size="md">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Estimated Delivery</span>
              <span className="text-gray-900">
                {order.estimatedDelivery || '3-5 business days'}
              </span>
            </div>
            {order.trackingNumber && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Tracking Number</span>
                <span className="font-mono text-sm text-gray-900">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          fullWidth={true}
          onClick={() => navigate(`/orders/${order.orderId}`)}
        >
          View Order Details
        </Button>
        <Button
          variant="secondary"
          fullWidth={true}
          onClick={() => navigate('/products')}
        >
          Continue Shopping
        </Button>
        <Button
          variant="ghost"
          fullWidth={true}
          onClick={() => navigate('/orders')}
        >
          View All Orders
        </Button>
      </div>
    </div>
  );
};
