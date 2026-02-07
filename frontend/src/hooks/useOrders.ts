import { useState, useCallback } from 'react';
import { orderService } from '../services/order.service';
import { useToast } from './useToast';
import type { Order, OrderListResponse, CreateOrderRequest } from '../types/order.types';

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  createLoading: boolean;
  fetchOrders: (page?: number, limit?: number) => Promise<void>;
  createOrder: (request: CreateOrderRequest) => Promise<Order | null>;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);

  const { showToast } = useToast();

  const fetchOrders = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        setLoading(true);
        setError(null);

        const response = await orderService.getOrders(page, limit);
        const data = response.data as OrderListResponse;

        setOrders(data.orders);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
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
    total,
    page,
    totalPages,
    createLoading,
    fetchOrders,
    createOrder,
  };
}
