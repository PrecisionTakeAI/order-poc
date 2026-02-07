import React from 'react';
import type { CartItem } from '../../types/cart.types';
import { QuantitySelector } from '../common/QuantitySelector';
import { formatCurrency } from '../../utils/format';

interface CartItemCardProps {
  item: CartItem;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  isUpdating: boolean;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onQuantityChange,
  onRemove,
  isUpdating,
}) => {
  const imageUrl = item.currentProduct?.imageUrl || '/placeholder-product.png';
  const productName = item.currentProduct?.name || item.productName;
  const currentPrice = item.currentProduct?.price || item.price;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity === 0) {
      onRemove(item.itemId);
    } else {
      onQuantityChange(item.itemId, newQuantity);
    }
  };

  return (
    <div className="flex gap-4 border-b border-gray-200 py-4 last:border-b-0">
      {/* Product Image */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        <img
          src={imageUrl}
          alt={productName}
          className="h-full w-full object-cover object-center"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-product.png';
          }}
        />
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{productName}</h3>
            <p className="mt-1 text-sm text-gray-500">{formatCurrency(currentPrice)}</p>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.itemId)}
            disabled={isUpdating}
            className="ml-4 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Remove item"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* Quantity Selector and Subtotal */}
        <div className="mt-3 flex items-center justify-between">
          <QuantitySelector
            value={item.quantity}
            min={0}
            max={item.currentProduct?.stock || 99}
            onChange={handleQuantityChange}
            disabled={isUpdating}
          />

          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency(item.subtotal)}
          </div>
        </div>
      </div>
    </div>
  );
};
