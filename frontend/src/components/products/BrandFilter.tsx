import React, { useState } from 'react';
import { Checkbox } from '../common';

interface BrandFilterProps {
  availableBrands: string[];
  selectedBrands: string[];
  onChange: (brands: string[]) => void;
}

export const BrandFilter: React.FC<BrandFilterProps> = ({
  availableBrands,
  selectedBrands,
  onChange,
}) => {
  const [showAll, setShowAll] = useState(false);

  const handleToggle = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      onChange(selectedBrands.filter((b) => b !== brand));
    } else {
      onChange([...selectedBrands, brand]);
    }
  };

  const displayedBrands = showAll ? availableBrands : availableBrands.slice(0, 10);
  const hasMore = availableBrands.length > 10;

  if (availableBrands.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Brand</h3>
      <div className="space-y-2">
        {displayedBrands.map((brand) => (
          <Checkbox
            key={brand}
            label={brand}
            checked={selectedBrands.includes(brand)}
            onChange={() => handleToggle(brand)}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            {showAll ? 'Show less' : `Show more (${availableBrands.length - 10} more)`}
          </button>
        )}
      </div>
    </div>
  );
};
