import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { ConfirmModal } from '../common/ConfirmModal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CartItemCard } from './CartItemCard';
import { CartSummary } from './CartSummary';
import { CartEmptyState } from './CartEmptyState';
import { CartSyncIndicator } from './CartSyncIndicator';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cart, loading, updateCartItem, removeFromCart, updateLoading, removeLoading } = useCart();
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    await updateCartItem(itemId, { quantity });
  };

  const handleRemoveClick = (itemId: string) => {
    setItemToRemove(itemId);
  };

  const handleRemoveConfirm = async () => {
    if (itemToRemove) {
      await removeFromCart(itemToRemove);
      setItemToRemove(null);
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    onClose();
    navigate('/products');
  };

  if (!isOpen) {
    return null;
  }

  const itemCount = cart?.itemCount || 0;
  const hasItems = itemCount > 0;
  const isUpdatingOrRemoving = updateLoading || removeLoading;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Shopping Cart {hasItems && `(${itemCount})`}
            </h2>
            <CartSyncIndicator />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close cart"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : !hasItems ? (
            <CartEmptyState />
          ) : (
            <div className="px-4 sm:px-6">
              {cart?.items.map((item) => (
                <CartItemCard
                  key={item.itemId}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveClick}
                  isUpdating={isUpdatingOrRemoving}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {hasItems && !loading && (
          <CartSummary
            totalAmount={cart?.totalAmount || 0}
            itemCount={itemCount}
            currency={cart?.currency || 'USD'}
            onCheckout={handleCheckout}
            onContinueShopping={handleContinueShopping}
          />
        )}
      </div>

      {/* Confirm Remove Modal */}
      <ConfirmModal
        isOpen={!!itemToRemove}
        onClose={() => setItemToRemove(null)}
        onConfirm={handleRemoveConfirm}
        title="Remove Item"
        message="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </div>,
    document.body
  );
};
