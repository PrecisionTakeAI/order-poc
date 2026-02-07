import React from 'react';
import { Checkbox } from '../common';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../types/product.types';

interface CategoryFilterProps {
  selectedCategories: ProductCategory[];
  onChange: (categories: ProductCategory[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onChange,
}) => {
  const handleToggle = (category: ProductCategory) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter((c) => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Categories
      </h3>
      <div className="space-y-2">
        {PRODUCT_CATEGORIES.map(({ value, label }) => (
          <Checkbox
            key={value}
            label={label}
            checked={selectedCategories.includes(value)}
            onChange={() => handleToggle(value)}
          />
        ))}
      </div>
    </div>
  );
};
