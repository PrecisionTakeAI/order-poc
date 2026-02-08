import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../common/FormField';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';
import { shippingFormSchema } from '../../utils/validation';
import type { ShippingFormData } from '../../types/order.types';

interface ShippingFormProps {
  onSubmit: (data: ShippingFormData) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const ShippingForm: React.FC<ShippingFormProps> = ({ onSubmit, loading, error }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingFormSchema),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Shipping Information</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <FormField
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.fullName?.message}
          register={register('fullName')}
        />

        <FormField
          label="Street Address"
          type="text"
          placeholder="123 Main Street"
          error={errors.street?.message}
          register={register('street')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="City"
            type="text"
            placeholder="New York"
            error={errors.city?.message}
            register={register('city')}
          />

          <FormField
            label="State/Province"
            type="text"
            placeholder="NY"
            error={errors.state?.message}
            register={register('state')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Postal Code"
            type="text"
            placeholder="10001"
            error={errors.postalCode?.message}
            register={register('postalCode')}
          />

          <FormField
            label="Country"
            type="text"
            placeholder="United States"
            error={errors.country?.message}
            register={register('country')}
          />
        </div>

        <div className="pt-4">
          <Button type="submit" loading={loading}>
            Place Order
          </Button>
        </div>
      </form>
    </div>
  );
};
