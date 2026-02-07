import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Cart, AddToCartRequest, UpdateCartItemRequest, CartContextType } from '../types/cart.types';
import { cartService } from '../services/cart.service';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Computed values
  const itemCount = cart?.itemCount ?? 0;
  const totalAmount = cart?.totalAmount ?? 0;
  const currency = cart?.currency ?? 'USD';

  const refetchCart = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await cartService.getCart();
      setCart(response.data);
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      setError(errorMessage);
      // Don't show toast on initial fetch failures
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(
    async (request: AddToCartRequest): Promise<void> => {
      const previousCart = cart;

      try {
        setAddLoading(true);

        // Optimistic update: increment itemCount
        if (cart) {
          setCart({
            ...cart,
            itemCount: cart.itemCount + request.quantity,
          });
        }

        const response = await cartService.addToCart(request);
        setCart(response.data);
        showToast('success', 'Item added to cart');
      } catch (err) {
        // Rollback on error
        setCart(previousCart);
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setAddLoading(false);
      }
    },
    [cart, showToast]
  );

  const updateCartItem = useCallback(
    async (itemId: string, request: UpdateCartItemRequest): Promise<void> => {
      const previousCart = cart;

      try {
        setUpdateLoading(true);

        // Optimistic update: update the specific item quantity
        if (cart) {
          const updatedItems = cart.items.map((item) =>
            item.itemId === itemId ? { ...item, quantity: request.quantity } : item
          );
          const totalItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

          setCart({
            ...cart,
            items: updatedItems,
            itemCount: totalItemCount,
          });
        }

        const response = await cartService.updateCartItem(itemId, request);
        setCart(response.data);
        showToast('success', 'Cart updated');
      } catch (err) {
        // Rollback on error
        setCart(previousCart);
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setUpdateLoading(false);
      }
    },
    [cart, showToast]
  );

  const removeFromCart = useCallback(
    async (itemId: string): Promise<void> => {
      const previousCart = cart;

      try {
        setRemoveLoading(true);

        // Optimistic update: filter out the item and recalculate counts
        if (cart) {
          const itemToRemove = cart.items.find((item) => item.itemId === itemId);
          const updatedItems = cart.items.filter((item) => item.itemId !== itemId);
          const totalItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

          setCart({
            ...cart,
            items: updatedItems,
            itemCount: totalItemCount,
            totalAmount: cart.totalAmount - (itemToRemove?.subtotal ?? 0),
          });
        }

        const response = await cartService.removeFromCart(itemId);
        setCart(response.data);
        showToast('success', 'Item removed from cart');
      } catch (err) {
        // Rollback on error
        setCart(previousCart);
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setRemoveLoading(false);
      }
    },
    [cart, showToast]
  );

  const clearCart = useCallback(async (): Promise<void> => {
    try {
      await cartService.clearCart();
      setCart(null);
      showToast('success', 'Cart cleared');
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      showToast('error', errorMessage);
    }
  }, [showToast]);

  // Auth lifecycle integration
  useEffect(() => {
    if (isAuthenticated) {
      // User logged in - fetch their cart
      refetchCart();
    } else {
      // User logged out - clear cart state
      setCart(null);
      setError(null);
    }
  }, [isAuthenticated, refetchCart]);

  const value: CartContextType = useMemo(
    () => ({
      cart,
      loading,
      error,
      itemCount,
      totalAmount,
      currency,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      refetchCart,
      addLoading,
      updateLoading,
      removeLoading,
    }),
    [
      cart,
      loading,
      error,
      itemCount,
      totalAmount,
      currency,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      refetchCart,
      addLoading,
      updateLoading,
      removeLoading,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
