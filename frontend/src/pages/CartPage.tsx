import React from 'react';

export const CartPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Shopping Cart</h1>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1">
          <p className="text-sm md:text-base text-gray-600">Your cart is empty. Start shopping!</p>
        </div>
        <aside className="lg:w-96 lg:sticky lg:top-20 lg:self-start">
        </aside>
      </div>
    </div>
  );
};
