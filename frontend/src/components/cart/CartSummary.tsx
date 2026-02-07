import React from 'react';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/format';

interface CartSummaryProps {
  totalAmount: number;
  itemCount: number;
  currency: string;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  totalAmount,
  itemCount,
  currency,
  onCheckout,
  onContinueShopping,
}) => {
  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Total */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button variant="primary" onClick={onCheckout} fullWidth size="md">
          Proceed to Checkout
        </Button>
        <Button variant="ghost" onClick={onContinueShopping} fullWidth size="md">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
};
