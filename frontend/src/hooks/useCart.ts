import { useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cart.service';
import { useToast } from './useToast';
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from '../types/cart.types';

export interface UseCartResult {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addLoading: boolean;
  updateLoading: boolean;
  removeLoading: boolean;
  clearLoading: boolean;
  itemCount: number;
  addToCart: (request: AddToCartRequest) => Promise<void>;
  updateCartItem: (itemId: string, request: UpdateCartItemRequest) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refetchCart: () => Promise<void>;
}

export function useCart(): UseCartResult {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const { showToast } = useToast();

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cartService.getCart();
      setCart(response.data);
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const addToCart = useCallback(
    async (request: AddToCartRequest) => {
      try {
        setAddLoading(true);

        const response = await cartService.addToCart(request);
        setCart(response.data);
        showToast('success', 'Item added to cart');
      } catch (err) {
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setAddLoading(false);
      }
    },
    [showToast]
  );

  const updateCartItem = useCallback(
    async (itemId: string, request: UpdateCartItemRequest) => {
      try {
        setUpdateLoading(true);

        const response = await cartService.updateCartItem(itemId, request);
        setCart(response.data);
        showToast('success', 'Cart updated');
      } catch (err) {
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setUpdateLoading(false);
      }
    },
    [showToast]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      try {
        setRemoveLoading(true);

        const response = await cartService.removeFromCart(itemId);
        setCart(response.data);
        showToast('success', 'Item removed from cart');
      } catch (err) {
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      } finally {
        setRemoveLoading(false);
      }
    },
    [showToast]
  );

  const clearCart = useCallback(async () => {
    try {
      setClearLoading(true);

      await cartService.clearCart();
      setCart(null);
      showToast('success', 'Cart cleared');
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      showToast('error', errorMessage);
    } finally {
      setClearLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const itemCount = cart?.itemCount || 0;

  return {
    cart,
    loading,
    error,
    addLoading,
    updateLoading,
    removeLoading,
    clearLoading,
    itemCount,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refetchCart: fetchCart,
  };
}
