import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { useFilters } from '../hooks/useFilters';
import {
  ProductCard,
  ProductCardSkeleton,
  Pagination,
  EmptyState,
} from '../components/common';
import { FilterSidebar, ActiveFilters } from '../components/products';

const PRODUCTS_PER_PAGE = 12;

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, loading, total, page, totalPages, fetchProducts } = useProducts();
  const { addToCart } = useCart();
  const {
    filters,
    setSearch,
    setCategories,
    setBrands,
    setPriceRange,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Extract unique brands from products
  const availableBrands = useMemo(() => {
    const brands = products
      .map((p) => p.brand)
      .filter((brand): brand is string => !!brand);
    return Array.from(new Set(brands)).sort();
  }, [products]);

  // Fetch products when page or filters change
  useEffect(() => {
    const filterParams: any = {
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
    };

    if (filters.search) {
      filterParams.filters = {
        search: filters.search,
      };
    }

    if (filters.categories.length > 0) {
      filterParams.filters = {
        ...filterParams.filters,
        category: filters.categories,
      };
    }

    if (filters.brands.length > 0) {
      filterParams.filters = {
        ...filterParams.filters,
        brand: filters.brands,
      };
    }

    if (filters.minPrice !== undefined) {
      filterParams.filters = {
        ...filterParams.filters,
        minPrice: filters.minPrice,
      };
    }

    if (filters.maxPrice !== undefined) {
      filterParams.filters = {
        ...filterParams.filters,
        maxPrice: filters.maxPrice,
      };
    }

    fetchProducts(filterParams);
  }, [
    currentPage,
    filters.search,
    filters.categories,
    filters.brands,
    filters.minPrice,
    filters.maxPrice,
    fetchProducts,
  ]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleAddToCart = async (productId: string) => {
    await addToCart({ productId, quantity: 1 });
  };

  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterClose = () => {
    setIsFilterOpen(false);
  };

  const filterCount =
    (filters.search ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  // Loading state - show skeleton grid
  if (loading && products.length === 0) {
    return (
      <div className="flex gap-6">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Browse our cricket equipment collection.
            </p>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6"
            aria-label="Loading products"
            aria-live="polite"
          >
            {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no products
  if (!loading && products.length === 0) {
    return (
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={handleFilterClose}
          search={filters.search}
          onSearchChange={setSearch}
          selectedCategories={filters.categories}
          onCategoriesChange={setCategories}
          selectedBrands={filters.brands}
          availableBrands={availableBrands}
          onBrandsChange={setBrands}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onPriceRangeChange={setPriceRange}
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Mobile Filter Button */}
          <div className="lg:hidden flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <button
              type="button"
              onClick={handleFilterToggle}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {filterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Browse our cricket equipment collection.
            </p>
          </div>

          <EmptyState
            icon={
              <svg
                className="h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            }
            title={hasActiveFilters ? "No Products Found" : "No Products Available"}
            message={
              hasActiveFilters
                ? "No products match your current filters. Try adjusting your search criteria."
                : "We don't have any products at the moment. Please check back later."
            }
            actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
            onAction={hasActiveFilters ? clearAllFilters : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={handleFilterClose}
        search={filters.search}
        onSearchChange={setSearch}
        selectedCategories={filters.categories}
        onCategoriesChange={setCategories}
        selectedBrands={filters.brands}
        availableBrands={availableBrands}
        onBrandsChange={setBrands}
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onPriceRangeChange={setPriceRange}
        onClearAll={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Mobile Filter Button */}
        <div className="lg:hidden flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button
            type="button"
            onClick={handleFilterToggle}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {filterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Products</h1>
            <span className="text-sm md:text-base text-gray-600" aria-live="polite">
              {total} {total === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Browse our cricket equipment collection.
          </p>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <ActiveFilters
            search={filters.search}
            categories={filters.categories}
            brands={filters.brands}
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
          />
        )}

        {/* Product Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          aria-label="Product list"
        >
          {products.map((product) => (
            <ProductCard
              key={product.productId}
              id={product.productId}
              name={product.name}
              price={product.price}
              imageUrl={product.imageUrl}
              rating={product.rating}
              inStock={product.stock > 0}
              onClick={handleProductClick}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-8">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('page', newPage.toString());
                navigate(`?${newParams.toString()}`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
