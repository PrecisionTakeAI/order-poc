import React, { useState, useEffect } from 'react';
import { Input } from '../common';

interface PriceRangeFilterProps {
  minPrice?: number;
  maxPrice?: number;
  onChange: (minPrice?: number, maxPrice?: number) => void;
}

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  onChange,
}) => {
  const [minValue, setMinValue] = useState(minPrice?.toString() || '');
  const [maxValue, setMaxValue] = useState(maxPrice?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMinValue(minPrice?.toString() || '');
    setMaxValue(maxPrice?.toString() || '');
  }, [minPrice, maxPrice]);

  const validateAndApply = () => {
    const min = minValue ? parseFloat(minValue) : undefined;
    const max = maxValue ? parseFloat(maxValue) : undefined;

    if (min !== undefined && isNaN(min)) {
      setError('Invalid minimum price');
      return;
    }

    if (max !== undefined && isNaN(max)) {
      setError('Invalid maximum price');
      return;
    }

    if (min !== undefined && max !== undefined && min > max) {
      setError('Minimum price cannot be greater than maximum price');
      return;
    }

    setError(null);
    onChange(min, max);
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinValue(e.target.value);
    setError(null);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxValue(e.target.value);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      validateAndApply();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Price Range
      </h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="min-price" className="block text-sm text-gray-700 mb-1">
            Min Price ($)
          </label>
          <Input
            id="min-price"
            type="number"
            value={minValue}
            onChange={handleMinChange}
            onBlur={validateAndApply}
            onKeyDown={handleKeyDown}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor="max-price" className="block text-sm text-gray-700 mb-1">
            Max Price ($)
          </label>
          <Input
            id="max-price"
            type="number"
            value={maxValue}
            onChange={handleMaxChange}
            onBlur={validateAndApply}
            onKeyDown={handleKeyDown}
            placeholder="1000"
            min="0"
            step="0.01"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};
