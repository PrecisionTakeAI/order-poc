import React from 'react';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../types/product.types';

interface ActiveFiltersProps {
  search?: string;
  categories: ProductCategory[];
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  onRemoveFilter: (type: 'search' | 'category' | 'brand' | 'price', value?: string) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  search,
  categories,
  brands,
  minPrice,
  maxPrice,
  onRemoveFilter,
  onClearAll,
}) => {
  const hasFilters =
    search || categories.length > 0 || brands.length > 0 || minPrice !== undefined || maxPrice !== undefined;

  if (!hasFilters) {
    return null;
  }

  const getCategoryLabel = (category: ProductCategory): string => {
    const cat = PRODUCT_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const formatPriceRange = (): string => {
    if (minPrice !== undefined && maxPrice !== undefined) {
      return `$${minPrice} - $${maxPrice}`;
    }
    if (minPrice !== undefined) {
      return `From $${minPrice}`;
    }
    if (maxPrice !== undefined) {
      return `Up to $${maxPrice}`;
    }
    return '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Active Filters:</span>

      {search && (
        <FilterTag
          label={`Search: "${search}"`}
          onRemove={() => onRemoveFilter('search')}
        />
      )}

      {categories.map((category) => (
        <FilterTag
          key={category}
          label={getCategoryLabel(category)}
          onRemove={() => onRemoveFilter('category', category)}
        />
      ))}

      {brands.map((brand) => (
        <FilterTag
          key={brand}
          label={brand}
          onRemove={() => onRemoveFilter('brand', brand)}
        />
      ))}

      {(minPrice !== undefined || maxPrice !== undefined) && (
        <FilterTag
          label={formatPriceRange()}
          onRemove={() => onRemoveFilter('price')}
        />
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        Clear All
      </button>
    </div>
  );
};

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

const FilterTag: React.FC<FilterTagProps> = ({ label, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded-full">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-primary-900 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </span>
  );
};
