import React from 'react';

export const CheckoutPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Checkout</h1>
      <div className="max-w-3xl">
        <p className="text-sm md:text-base text-gray-600 mb-6">Complete your order.</p>
        <form className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          </div>
        </form>
      </div>
    </div>
  );
};
