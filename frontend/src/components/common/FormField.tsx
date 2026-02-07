import React from 'react';
import { Input } from './Input';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  register?: any;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  register,
  ...props
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <Input error={!!error} {...register} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
