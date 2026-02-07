import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary-600">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="mb-8 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/home">
          <Button className="inline-flex w-auto">Go to Home</Button>
        </Link>
      </div>
    </div>
  );
};
