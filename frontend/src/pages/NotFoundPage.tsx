import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="text-center">
        <h1 className="mb-2 text-8xl font-bold text-primary-600">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Bowled Out! This page doesn't exist.
        </h2>
        <p className="mb-8 text-gray-600">
          Looks like this delivery went wide. The page you're looking for has been moved or doesn't
          exist.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/">
            <Button className="inline-flex w-auto">Go to Home</Button>
          </Link>
          <Button variant="secondary" onClick={handleGoBack} className="w-auto">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
