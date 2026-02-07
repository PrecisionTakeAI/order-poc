import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { StarRating } from './StarRating';
import { Button } from './Button';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  inStock?: boolean;
  onAddToCart?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  imageUrl,
  rating = 0,
  inStock = true,
  onAddToCart,
  onClick,
  className = '',
}) => {
  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(id);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Out of Stock Badge */}
        {!inStock && (
          <div className="absolute top-2 right-2">
            <Badge variant="error" size="sm">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{name}</h3>

        {rating > 0 && <StarRating rating={rating} size="sm" showNumeric />}

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600">
            ${price.toFixed(2)}
          </span>

          {onAddToCart && (
            <Button
              variant="primary"
              size="sm"
              fullWidth={false}
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
