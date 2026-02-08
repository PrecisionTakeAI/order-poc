import React from 'react';
import type { CartItem } from '../../types/cart.types';
import { formatCurrency } from '../../utils/format';

interface OrderSummarySectionProps {
  items: CartItem[];
  currency: string;
  totalAmount: number;
}

export const OrderSummarySection: React.FC<OrderSummarySectionProps> = ({
  items,
  currency,
  totalAmount,
}) => {
  const shipping = 0;
  const subtotal = totalAmount;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.itemId} className="flex gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">{item.productName}</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qty: {item.quantity} x {formatCurrency(item.price, currency)}
              </p>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(item.subtotal, currency)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>{formatCurrency(shipping, currency)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(totalAmount + shipping, currency)}</span>
        </div>
      </div>
    </div>
  );
};
