import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Cart, AddToCartRequest, UpdateCartItemRequest, CartContextType, SyncStatus, QueuedCartOperation } from '../types/cart.types';
import { cartService } from '../services/cart.service';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import axios from 'axios';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

const MAX_RETRIES = 3;

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Refs for persistence logic
  const lastSyncedCartRef = useRef<Cart | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const offlineQueueRef = useRef<QueuedCartOperation[]>([]);

  // Computed values
  const itemCount = cart?.itemCount ?? 0;
  const totalAmount = cart?.totalAmount ?? 0;
  const currency = cart?.currency ?? 'USD';

  // Online/Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('warning', 'You are offline. Changes will sync when online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueueRef.current.length === 0) return;

    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];

    for (const operation of queue) {
      if (operation.retries >= MAX_RETRIES) {
        showToast('error', 'Failed to sync cart changes after multiple retries');
        continue;
      }

      try {
        // Process each queued operation
        switch (operation.type) {
          case 'add':
            await cartService.addToCart(operation.payload as AddToCartRequest);
            break;
          case 'update': {
            const { productId, request } = operation.payload as { productId: string; request: UpdateCartItemRequest };
            await cartService.updateCartItem(productId, request);
            break;
          }
          case 'remove':
            await cartService.removeFromCart(operation.payload as string);
            break;
          case 'clear':
            await cartService.clearCart();
            break;
        }
      } catch (err) {
        // Re-queue on failure
        offlineQueueRef.current.push({
          ...operation,
          retries: operation.retries + 1,
        });
      }
    }

    // Refetch cart after processing queue
    if (queue.length > 0) {
      await refetchCart();
      showToast('success', 'Cart synced successfully');
    }
  }, [showToast]);

  const refetchCart = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setSyncStatus('pending');

      const response = await cartService.getCart();
      setCart(response.data);
      lastSyncedCartRef.current = response.data;
      setSyncStatus('synced');
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      setError(errorMessage);
      setSyncStatus('error');
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
        setSyncStatus('pending');

        // Optimistic update: increment itemCount
        if (cart) {
          setCart({
            ...cart,
            itemCount: cart.itemCount + request.quantity,
          });
        }

        const response = await cartService.addToCart(request);
        setCart(response.data);
        lastSyncedCartRef.current = response.data;
        setSyncStatus('synced');
        showToast('success', 'Item added to cart');
      } catch (err) {
        // Check if it's a network error
        if (axios.isAxiosError(err) && !err.response) {
          // Network error - queue for offline retry
          offlineQueueRef.current.push({
            type: 'add',
            payload: request,
            retries: 0,
            timestamp: Date.now(),
          });
          setSyncStatus('error');
          showToast('warning', 'Changes will sync when online');
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Conflict error - refetch cart (server wins)
          setCart(previousCart);
          await refetchCart();
          showToast('warning', 'Cart was updated by another session. Please try again.');
        } else {
          // Rollback on other errors
          setCart(previousCart);
          setSyncStatus('error');
          const errorMessage = cartService.handleError(err);
          showToast('error', errorMessage);
        }
      } finally {
        setAddLoading(false);
      }
    },
    [cart, showToast, refetchCart]
  );

  const updateCartItem = useCallback(
    async (itemId: string, request: UpdateCartItemRequest): Promise<void> => {
      const previousCart = cart;

      try {
        setUpdateLoading(true);
        setSyncStatus('pending');

        // Find the productId from itemId
        const item = cart?.items.find((item) => item.itemId === itemId);
        if (!item) {
          throw new Error('Item not found in cart');
        }
        const productId = item.productId;

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

        const response = await cartService.updateCartItem(productId, request);
        setCart(response.data);
        lastSyncedCartRef.current = response.data;
        setSyncStatus('synced');
        showToast('success', 'Cart updated');
      } catch (err) {
        // Check if it's a network error
        if (axios.isAxiosError(err) && !err.response) {
          // Network error - queue for offline retry
          const item = cart?.items.find((item) => item.itemId === itemId);
          if (item) {
            offlineQueueRef.current.push({
              type: 'update',
              payload: { productId: item.productId, request },
              retries: 0,
              timestamp: Date.now(),
            });
          }
          setSyncStatus('error');
          showToast('warning', 'Changes will sync when online');
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Conflict error - refetch cart (server wins)
          setCart(previousCart);
          await refetchCart();
          showToast('warning', 'Cart was updated by another session. Please try again.');
        } else {
          // Rollback on other errors
          setCart(previousCart);
          setSyncStatus('error');
          const errorMessage = cartService.handleError(err);
          showToast('error', errorMessage);
        }
      } finally {
        setUpdateLoading(false);
      }
    },
    [cart, showToast, refetchCart]
  );

  const removeFromCart = useCallback(
    async (itemId: string): Promise<void> => {
      const previousCart = cart;

      try {
        setRemoveLoading(true);
        setSyncStatus('pending');

        // Find the productId from itemId
        const item = cart?.items.find((item) => item.itemId === itemId);
        if (!item) {
          throw new Error('Item not found in cart');
        }
        const productId = item.productId;

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

        const response = await cartService.removeFromCart(productId);
        setCart(response.data);
        lastSyncedCartRef.current = response.data;
        setSyncStatus('synced');
        showToast('success', 'Item removed from cart');
      } catch (err) {
        // Check if it's a network error
        if (axios.isAxiosError(err) && !err.response) {
          // Network error - queue for offline retry
          const item = cart?.items.find((item) => item.itemId === itemId);
          if (item) {
            offlineQueueRef.current.push({
              type: 'remove',
              payload: item.productId,
              retries: 0,
              timestamp: Date.now(),
            });
          }
          setSyncStatus('error');
          showToast('warning', 'Changes will sync when online');
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Conflict error - refetch cart (server wins)
          setCart(previousCart);
          await refetchCart();
          showToast('warning', 'Cart was updated by another session. Please try again.');
        } else {
          // Rollback on other errors
          setCart(previousCart);
          setSyncStatus('error');
          const errorMessage = cartService.handleError(err);
          showToast('error', errorMessage);
        }
      } finally {
        setRemoveLoading(false);
      }
    },
    [cart, showToast, refetchCart]
  );

  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setSyncStatus('pending');
      await cartService.clearCart();
      setCart(null);
      lastSyncedCartRef.current = null;
      setSyncStatus('synced');
      showToast('success', 'Cart cleared');
    } catch (err) {
      setSyncStatus('error');
      const errorMessage = cartService.handleError(err);
      showToast('error', errorMessage);
    }
  }, [showToast]);

  const clearCartAfterOrder = useCallback(async (): Promise<void> => {
    try {
      await cartService.clearCart();
      setCart(null);
      lastSyncedCartRef.current = null;
      // Clear save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Clear offline queue
      offlineQueueRef.current = [];
      setSyncStatus('synced');
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      throw new Error(errorMessage);
    }
  }, []);

  // Auth lifecycle integration
  useEffect(() => {
    if (isAuthenticated) {
      // User logged in - fetch their cart
      refetchCart();
    } else {
      // User logged out - clear cart state, timeout, and offline queue
      setCart(null);
      setError(null);
      lastSyncedCartRef.current = null;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      offlineQueueRef.current = [];
      setSyncStatus('synced');
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
      syncStatus,
      isOnline,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      clearCartAfterOrder,
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
      syncStatus,
      isOnline,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      clearCartAfterOrder,
      refetchCart,
      addLoading,
      updateLoading,
      removeLoading,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
