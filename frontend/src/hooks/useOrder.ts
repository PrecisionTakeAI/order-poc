import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/order.service';
import { useToast } from './useToast';
import type { Order } from '../types/order.types';

export interface UseOrderResult {
  order: Order | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrder(orderId?: string): UseOrderResult {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await orderService.getOrder(orderId);
      setOrder(response.data);
    } catch (err) {
      const errorMessage = orderService.handleError(err);
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    loading,
    error,
    refetch: fetchOrder,
  };
}
