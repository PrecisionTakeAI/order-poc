import React, { useState } from 'react';

interface ProductImageDisplayProps {
  imageUrl?: string;
  alt: string;
  className?: string;
}

export const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({
  imageUrl,
  alt,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const showPlaceholder = !imageUrl || imageError;

  return (
    <div className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      {showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center">
          <svg
            className="h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
};
