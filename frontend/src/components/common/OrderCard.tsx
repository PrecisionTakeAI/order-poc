import React from 'react';
import { Card, CardHeader, CardBody } from './Card';
import { Badge } from './Badge';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderCardProps {
  orderId: string;
  date: string;
  total: number;
  status: OrderStatus;
  itemCount: number;
  onClick?: (orderId: string) => void;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  orderId,
  date,
  total,
  status,
  itemCount,
  onClick,
  className = '',
}) => {
  const statusConfig: Record<
    OrderStatus,
    { variant: 'secondary' | 'info' | 'warning' | 'success' | 'error'; label: string }
  > = {
    pending: { variant: 'secondary', label: 'Pending' },
    processing: { variant: 'info', label: 'Processing' },
    shipped: { variant: 'warning', label: 'Shipped' },
    delivered: { variant: 'success', label: 'Delivered' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  };

  const handleClick = () => {
    if (onClick) {
      onClick(orderId);
    }
  };

  return (
    <Card
      className={`transition-shadow hover:shadow-lg ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Order #{orderId}</h3>
            <p className="text-sm text-gray-600">{date}</p>
          </div>
          <Badge variant={statusConfig[status].variant} size="md">
            {statusConfig[status].label}
          </Badge>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm md:text-base text-gray-600">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-900">${total.toFixed(2)}</p>
          </div>

          {onClick && (
            <button
              className="text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="View order details"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
