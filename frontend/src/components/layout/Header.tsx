import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { navigationItems } from '../../constants/navigation';
import { SearchBar } from './SearchBar';
import { CartIcon } from './CartIcon';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';

export const Header: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredItems = navigationItems.filter((item) => !item.adminOnly || isAdmin());

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary-600">CricketGear</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center space-x-1 md:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              Home
            </NavLink>
            {filteredItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side: Search, Cart, User, Mobile toggle */}
          <div className="flex items-center gap-4">
            <SearchBar />
            <CartIcon />
            <div className="hidden md:block">
              <UserMenu />
            </div>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
};
