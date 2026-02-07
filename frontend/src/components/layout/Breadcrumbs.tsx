import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSegmentLabel } from '../../utils/breadcrumbs';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/') {
    return null;
  }

  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="border-b border-gray-200 bg-white" aria-label="Breadcrumb">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center space-x-2 py-3 text-sm">
          <li>
            <Link to="/" className="text-gray-500 hover:text-primary-600">
              Home
            </Link>
          </li>
          {segments.map((segment, index) => {
            const path = '/' + segments.slice(0, index + 1).join('/');
            const isLast = index === segments.length - 1;
            const label = getSegmentLabel(segment);

            return (
              <li key={path} className="flex items-center space-x-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {isLast ? (
                  <span className="font-medium text-gray-900">{label}</span>
                ) : (
                  <Link to={path} className="text-gray-500 hover:text-primary-600">
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
