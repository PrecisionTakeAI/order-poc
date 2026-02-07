import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { ProductCategory } from '../types/product.types';

export interface FilterState {
  search: string;
  categories: ProductCategory[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
}

export interface UseFiltersResult {
  filters: FilterState;
  setSearch: (search: string) => void;
  setCategories: (categories: ProductCategory[]) => void;
  setBrands: (brands: string[]) => void;
  setPriceRange: (minPrice?: number, maxPrice?: number) => void;
  removeFilter: (type: 'search' | 'category' | 'brand' | 'price', value?: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export function useFilters(): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo((): FilterState => {
    const search = searchParams.get('search') || '';
    const categoryParam = searchParams.get('category');
    const categories = categoryParam
      ? (categoryParam.split(',') as ProductCategory[])
      : [];
    const brandParam = searchParams.get('brand');
    const brands = brandParam ? brandParam.split(',') : [];
    const minPriceParam = searchParams.get('minPrice');
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPriceParam = searchParams.get('maxPrice');
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    return {
      search,
      categories,
      brands,
      minPrice,
      maxPrice,
    };
  }, [searchParams]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.categories.length > 0 ||
      filters.brands.length > 0 ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined
    );
  }, [filters]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        Object.entries(updates).forEach(([key, value]) => {
          if (value) {
            newParams.set(key, value);
          } else {
            newParams.delete(key);
          }
        });

        // Reset page to 1 when filters change
        newParams.set('page', '1');

        return newParams;
      });
    },
    [setSearchParams]
  );

  const setSearch = useCallback(
    (search: string) => {
      updateParams({ search: search || undefined });
    },
    [updateParams]
  );

  const setCategories = useCallback(
    (categories: ProductCategory[]) => {
      updateParams({ category: categories.length > 0 ? categories.join(',') : undefined });
    },
    [updateParams]
  );

  const setBrands = useCallback(
    (brands: string[]) => {
      updateParams({ brand: brands.length > 0 ? brands.join(',') : undefined });
    },
    [updateParams]
  );

  const setPriceRange = useCallback(
    (minPrice?: number, maxPrice?: number) => {
      updateParams({
        minPrice: minPrice !== undefined ? minPrice.toString() : undefined,
        maxPrice: maxPrice !== undefined ? maxPrice.toString() : undefined,
      });
    },
    [updateParams]
  );

  const removeFilter = useCallback(
    (type: 'search' | 'category' | 'brand' | 'price', value?: string) => {
      switch (type) {
        case 'search':
          setSearch('');
          break;
        case 'category':
          if (value) {
            setCategories(filters.categories.filter((c) => c !== value));
          }
          break;
        case 'brand':
          if (value) {
            setBrands(filters.brands.filter((b) => b !== value));
          }
          break;
        case 'price':
          setPriceRange(undefined, undefined);
          break;
      }
    },
    [filters.categories, filters.brands, setSearch, setCategories, setBrands, setPriceRange]
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    filters,
    setSearch,
    setCategories,
    setBrands,
    setPriceRange,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
