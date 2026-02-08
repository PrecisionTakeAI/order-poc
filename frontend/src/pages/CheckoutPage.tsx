import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { OrderSummarySection, ShippingForm } from '../components/checkout';
import { orderService } from '../services/order.service';
import type { ShippingFormData } from '../types/order.types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, totalAmount, itemCount, currency, clearCartAfterOrder } = useCart();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemCount === 0 && !cart?.items.length) {
      showToast('warning', 'Your cart is empty. Please add items before checking out.');
      navigate('/products');
    }
  }, [itemCount, cart, navigate, showToast]);

  const handleSubmit = async (data: ShippingFormData) => {
    setLoading(true);
    setError(null);

    try {
      const orderRequest = {
        shippingAddress: {
          fullName: data.fullName,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        paymentMethod: 'credit_card',
      };

      const response = await orderService.createOrder(orderRequest);

      await clearCartAfterOrder();

      showToast('success', 'Order placed successfully!');
      navigate(`/orders/${response.data.orderId}`);
    } catch (err) {
      const errorMessage = orderService.handleError(err);
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!cart || itemCount === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <OrderSummarySection items={cart.items} currency={currency} totalAmount={totalAmount} />
        </div>

        <div className="lg:col-span-2">
          <ShippingForm onSubmit={handleSubmit} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
};
