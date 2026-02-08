import { useState, useCallback } from 'react';
import { orderService } from '../services/order.service';
import { useToast } from './useToast';
import type { Order, OrderListResponse, CreateOrderRequest } from '../types/order.types';

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  count: number;
  hasMore: boolean;
  lastKey?: string;
  createLoading: boolean;
  fetchOrders: (limit?: number, status?: string, lastKey?: string, append?: boolean) => Promise<void>;
  createOrder: (request: CreateOrderRequest) => Promise<Order | null>;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const [createLoading, setCreateLoading] = useState(false);

  const { showToast } = useToast();

  const fetchOrders = useCallback(
    async (limit: number = 10, status?: string, lastKeyParam?: string, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const response = await orderService.getOrders(limit, status, lastKeyParam);
        const data = response.data as OrderListResponse;

        if (append) {
          setOrders((prev) => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders);
        }

        setCount(data.count);
        setHasMore(data.hasMore);
        setLastKey(data.lastKey);
      } catch (err) {
        const errorMessage = orderService.handleError(err);
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const createOrder = useCallback(
    async (request: CreateOrderRequest): Promise<Order | null> => {
      try {
        setCreateLoading(true);

        const response = await orderService.createOrder(request);
        const order = response.data;

        showToast('success', 'Order created successfully');
        return order;
      } catch (err) {
        const errorMessage = orderService.handleError(err);
        showToast('error', errorMessage);
        return null;
      } finally {
        setCreateLoading(false);
      }
    },
    [showToast]
  );

  return {
    orders,
    loading,
    error,
    count,
    hasMore,
    lastKey,
    createLoading,
    fetchOrders,
    createOrder,
  };
}
