import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dropdownRef = useClickOutside<HTMLDivElement>(handleClose);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="User menu"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            {user?.fullName && <p className="text-sm font-medium text-gray-900">{user.fullName}</p>}
            <p className="truncate text-sm text-gray-500">{user?.email}</p>
          </div>
          <Link
            to="/orders"
            onClick={handleClose}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            My Orders
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
