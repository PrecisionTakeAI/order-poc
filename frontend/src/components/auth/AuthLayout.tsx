import React from 'react';
import { Card } from '../common/Card';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="mb-2 text-2xl md:text-3xl font-bold text-primary-600">Cricket Equipment Portal</h1>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="mt-2 text-sm md:text-base text-gray-600">{subtitle}</p>}
        </div>
        <Card>{children}</Card>
      </div>
    </div>
  );
};
