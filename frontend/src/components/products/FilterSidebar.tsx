import React from 'react';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { PriceRangeFilter } from './PriceRangeFilter';
import { BrandFilter } from './BrandFilter';
import type { ProductCategory } from '../../types/product.types';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedCategories: ProductCategory[];
  onCategoriesChange: (categories: ProductCategory[]) => void;
  selectedBrands: string[];
  availableBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceRangeChange: (minPrice?: number, maxPrice?: number) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedBrands,
  availableBrands,
  onBrandsChange,
  minPrice,
  maxPrice,
  onPriceRangeChange,
  onClearAll,
  hasActiveFilters,
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen lg:h-auto z-50 lg:z-0
          w-72 lg:w-72
          bg-white shadow-lg lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4 lg:p-0 space-y-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden border-b border-gray-200 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close filters"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <SearchBar value={search} onChange={onSearchChange} />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Category Filter */}
          <CategoryFilter
            selectedCategories={selectedCategories}
            onChange={onCategoriesChange}
          />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Price Range Filter */}
          <PriceRangeFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChange={onPriceRangeChange}
          />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Brand Filter */}
          <BrandFilter
            availableBrands={availableBrands}
            selectedBrands={selectedBrands}
            onChange={onBrandsChange}
          />

          {/* Clear All Button */}
          {hasActiveFilters && (
            <>
              <div className="border-t border-gray-200" />
              <button
                type="button"
                onClick={onClearAll}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All Filters
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
