import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import {
  ProductCard,
  ProductCardSkeleton,
  Pagination,
  EmptyState,
} from '../components/common';

const PRODUCTS_PER_PAGE = 12;

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, loading, total, page, totalPages, fetchProducts } = useProducts();
  const { addToCart } = useCart();
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch products when component mounts or page changes
  useEffect(() => {
    fetchProducts({ page: currentPage, limit: PRODUCTS_PER_PAGE });
  }, [currentPage, fetchProducts]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleAddToCart = async (productId: string) => {
    await addToCart({ productId, quantity: 1 });
  };

  // Loading state - show skeleton grid
  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Browse our cricket equipment collection.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
          aria-label="Loading products"
          aria-live="polite"
        >
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no products
  if (!loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
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
          title="No Products Available"
          message="We don't have any products at the moment. Please check back later."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
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

      {/* Product Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
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
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};
