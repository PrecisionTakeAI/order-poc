import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/product.service';
import { useToast } from './useToast';
import type { Product } from '../types/product.types';

export interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProduct(productId?: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await productService.getProduct(productId);
      setProduct(response.data);
    } catch (err) {
      const errorMessage = productService.handleError(err);
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}
