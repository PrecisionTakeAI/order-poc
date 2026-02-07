import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { useCart } from '../hooks/useCart';
import {
  Button,
  StarRating,
  Badge,
  LoadingSpinner,
  EmptyState,
  QuantitySelector,
  ProductImageDisplay,
} from '../components/common';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { product, loading, error, refetch } = useProduct(productId);
  const { addToCart, addLoading } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (!product) return;

    await addToCart({ productId: product.productId, quantity });
    setQuantity(1);
  };

  const handleBackToProducts = () => {
    navigate('/products');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <div className="space-y-4">
        <Link
          to="/products"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Products
        </Link>

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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          title="Error Loading Product"
          message={error}
          actionLabel="Retry"
          onAction={refetch}
        />
      </div>
    );
  }

  // Not found state
  if (!product) {
    return (
      <div className="space-y-4">
        <Link
          to="/products"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Products
        </Link>

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
          title="Product Not Found"
          message="The product you're looking for doesn't exist or has been removed."
          actionLabel="Browse Products"
          onAction={handleBackToProducts}
        />
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const maxQuantity = Math.min(product.stock, 99);

  return (
    <div className="space-y-6">
      {/* Back to Products Link */}
      <Link
        to="/products"
        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Products
      </Link>

      {/* Product Detail */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column - Image */}
        <div>
          <ProductImageDisplay imageUrl={product.imageUrl} alt={product.name} />
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Brand */}
          {product.brand && (
            <p className="text-sm font-medium text-gray-500">{product.brand}</p>
          )}

          {/* Name */}
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-3">
              <StarRating rating={product.rating} size="md" showNumeric />
              {product.reviewCount !== undefined && product.reviewCount > 0 && (
                <span className="text-sm text-gray-600">
                  ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="border-t border-b border-gray-200 py-4">
            <p className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</p>
          </div>

          {/* Stock Status */}
          <div>
            {isOutOfStock ? (
              <Badge variant="error" size="md">
                Out of Stock
              </Badge>
            ) : product.stock <= 10 ? (
              <Badge variant="warning" size="md">
                Only {product.stock} left in stock
              </Badge>
            ) : (
              <Badge variant="success" size="md">
                In Stock
              </Badge>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Description</h2>
            <p className="text-base text-gray-600">{product.description}</p>
          </div>

          {/* Category */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Category</h2>
            <Badge variant="secondary" size="md">
              {product.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          </div>

          {/* Quantity Selector and Add to Cart */}
          {!isOutOfStock && (
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-4">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                  Quantity:
                </label>
                <QuantitySelector
                  value={quantity}
                  min={1}
                  max={maxQuantity}
                  onChange={setQuantity}
                  disabled={addLoading}
                />
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                loading={addLoading}
                disabled={isOutOfStock}
                fullWidth
                leftIcon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
              >
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
