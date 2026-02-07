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
const DEBOUNCE_DELAY_MS = 1000;
const MAX_QUEUE_SIZE = 50;

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
  const pendingUpdateRef = useRef<{ productId: string; request: UpdateCartItemRequest } | null>(null);

  // Refs for stable function references (avoids stale closures in event listeners)
  const processOfflineQueueRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Computed values
  const itemCount = cart?.itemCount ?? 0;
  const totalAmount = cart?.totalAmount ?? 0;
  const currency = cart?.currency ?? 'USD';

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
      } catch {
        // On failure, stop processing remaining queue items and re-queue all remaining
        const failedOp = { ...operation, retries: operation.retries + 1 };
        const remainingIdx = queue.indexOf(operation);
        const remaining = queue.slice(remainingIdx + 1);
        offlineQueueRef.current = [failedOp, ...remaining];
        showToast('error', 'Failed to sync some cart changes. Retry when ready.');
        setSyncStatus('error');
        return;
      }
    }

    // Refetch cart after processing queue to ensure consistency
    await refetchCart();
    showToast('success', 'Cart synced successfully');
  }, [showToast]);

  // Keep ref in sync
  processOfflineQueueRef.current = processOfflineQueue;

  // Online/Offline event listeners (uses refs to avoid stale closures)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueueRef.current?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToastRef.current('warning', 'You are offline. Changes will sync when online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to queue an operation for offline retry
  const queueOfflineOperation = useCallback((operation: QueuedCartOperation) => {
    if (offlineQueueRef.current.length >= MAX_QUEUE_SIZE) {
      showToast('error', 'Too many pending changes. Please reconnect to sync.');
      return;
    }
    offlineQueueRef.current.push(operation);
    setSyncStatus('error');
    showToast('warning', 'Changes will sync when online');
  }, [showToast]);

  // Flush debounced update - sends the pending update to the API
  const flushDebouncedUpdate = useCallback(async () => {
    const pending = pendingUpdateRef.current;
    if (!pending) return;
    pendingUpdateRef.current = null;

    try {
      const response = await cartService.updateCartItem(pending.productId, pending.request);
      setCart(response.data);
      lastSyncedCartRef.current = response.data;
      setSyncStatus('synced');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        queueOfflineOperation({
          type: 'update',
          payload: { productId: pending.productId, request: pending.request },
          retries: 0,
          timestamp: Date.now(),
        });
      } else if (axios.isAxiosError(err) && err.response?.status === 409) {
        await refetchCart();
        showToast('warning', 'Cart was updated by another session. Please try again.');
      } else {
        setSyncStatus('error');
        const errorMessage = cartService.handleError(err);
        showToast('error', errorMessage);
      }
    } finally {
      setUpdateLoading(false);
    }
  }, [showToast, refetchCart, queueOfflineOperation]);

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
        if (axios.isAxiosError(err) && !err.response) {
          queueOfflineOperation({
            type: 'add',
            payload: request,
            retries: 0,
            timestamp: Date.now(),
          });
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          setCart(previousCart);
          await refetchCart();
          showToast('warning', 'Cart was updated by another session. Please try again.');
        } else {
          setCart(previousCart);
          setSyncStatus('error');
          const errorMessage = cartService.handleError(err);
          showToast('error', errorMessage);
        }
      } finally {
        setAddLoading(false);
      }
    },
    [cart, showToast, refetchCart, queueOfflineOperation]
  );

  const updateCartItem = useCallback(
    async (itemId: string, request: UpdateCartItemRequest): Promise<void> => {
      // Find the productId from itemId
      const item = cart?.items.find((i) => i.itemId === itemId);
      if (!item) {
        showToast('error', 'Item not found in cart');
        return;
      }
      const productId = item.productId;

      // Optimistic update: update the specific item quantity immediately
      if (cart) {
        const updatedItems = cart.items.map((i) =>
          i.itemId === itemId ? { ...i, quantity: request.quantity } : i
        );
        const totalItemCount = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

        setCart({
          ...cart,
          items: updatedItems,
          itemCount: totalItemCount,
        });
      }

      setUpdateLoading(true);
      setSyncStatus('pending');

      // Store the pending update
      pendingUpdateRef.current = { productId, request };

      // Clear existing debounce timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce: schedule API call after delay
      saveTimeoutRef.current = window.setTimeout(() => {
        saveTimeoutRef.current = null;
        flushDebouncedUpdate();
      }, DEBOUNCE_DELAY_MS);
    },
    [cart, showToast, flushDebouncedUpdate]
  );

  const removeFromCart = useCallback(
    async (itemId: string): Promise<void> => {
      const previousCart = cart;

      // Find the productId from itemId
      const item = cart?.items.find((i) => i.itemId === itemId);
      if (!item) {
        showToast('error', 'Item not found in cart');
        return;
      }
      const productId = item.productId;

      try {
        setRemoveLoading(true);
        setSyncStatus('pending');

        // Flush any pending debounced update before removing
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
          pendingUpdateRef.current = null;
        }

        // Optimistic update: filter out the item
        if (cart) {
          const itemToRemove = cart.items.find((i) => i.itemId === itemId);
          const updatedItems = cart.items.filter((i) => i.itemId !== itemId);
          const totalItemCount = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

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
        if (axios.isAxiosError(err) && !err.response) {
          queueOfflineOperation({
            type: 'remove',
            payload: productId,
            retries: 0,
            timestamp: Date.now(),
          });
        } else if (axios.isAxiosError(err) && err.response?.status === 409) {
          setCart(previousCart);
          await refetchCart();
          showToast('warning', 'Cart was updated by another session. Please try again.');
        } else {
          setCart(previousCart);
          setSyncStatus('error');
          const errorMessage = cartService.handleError(err);
          showToast('error', errorMessage);
        }
      } finally {
        setRemoveLoading(false);
      }
    },
    [cart, showToast, refetchCart, queueOfflineOperation]
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
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingUpdateRef.current = null;
      offlineQueueRef.current = [];
      setSyncStatus('synced');
    } catch (err) {
      const errorMessage = cartService.handleError(err);
      throw new Error(errorMessage);
    }
  }, []);

  // Manual retry for failed syncs
  const retrySync = useCallback(async (): Promise<void> => {
    if (offlineQueueRef.current.length > 0) {
      await processOfflineQueue();
    } else {
      await refetchCart();
    }
  }, [processOfflineQueue, refetchCart]);

  // Auth lifecycle integration
  useEffect(() => {
    if (isAuthenticated) {
      refetchCart();
    } else {
      setCart(null);
      setError(null);
      lastSyncedCartRef.current = null;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingUpdateRef.current = null;
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
      retrySync,
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
      retrySync,
      addLoading,
      updateLoading,
      removeLoading,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
