import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from './Input';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  register?: UseFormRegisterReturn;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, register, ...props }) => {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <Input error={!!error} {...register} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
