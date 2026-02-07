import { useState, useCallback } from 'react';
import { productService } from '../services/product.service';
import { useToast } from './useToast';
import type {
  Product,
  ProductFilters,
  ProductListParams,
  ProductListResponse,
} from '../types/product.types';

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  fetchProducts: (params?: ProductListParams) => Promise<void>;
  searchProducts: (query: string, params?: Omit<ProductListParams, 'filters'>) => Promise<void>;
  filterProducts: (
    filters: ProductFilters,
    params?: Omit<ProductListParams, 'filters'>
  ) => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const { showToast } = useToast();

  const fetchProducts = useCallback(
    async (params?: ProductListParams) => {
      try {
        setLoading(true);
        setError(null);

        const response = await productService.getProducts(params);
        const data = response.data as ProductListResponse;

        setProducts(data.products);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        const errorMessage = productService.handleError(err);
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const searchProducts = useCallback(
    async (query: string, params?: Omit<ProductListParams, 'filters'>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await productService.searchProducts(query, params);
        const data = response.data as ProductListResponse;

        setProducts(data.products);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        const errorMessage = productService.handleError(err);
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const filterProducts = useCallback(
    async (filters: ProductFilters, params?: Omit<ProductListParams, 'filters'>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await productService.filterProducts(filters, params);
        const data = response.data as ProductListResponse;

        setProducts(data.products);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (err) {
        const errorMessage = productService.handleError(err);
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  return {
    products,
    loading,
    error,
    total,
    page,
    totalPages,
    fetchProducts,
    searchProducts,
    filterProducts,
  };
}
