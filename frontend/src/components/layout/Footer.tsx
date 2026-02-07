import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About Us */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              About Us
            </h3>
            <p className="mt-4 text-sm text-gray-600">
              CricketGear is your premier destination for quality cricket equipment. From bats to
              pads, we have everything you need to play your best game.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/products" className="text-sm text-gray-600 hover:text-primary-600">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-sm text-gray-600 hover:text-primary-600">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm text-gray-600 hover:text-primary-600">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Contact Info
            </h3>
            <ul className="mt-4 space-y-2">
              <li className="text-sm text-gray-600">support@cricketgear.com</li>
              <li className="text-sm text-gray-600">+1 (555) 123-4567</li>
              <li className="text-sm text-gray-600">Mon - Fri: 9AM - 6PM</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} CricketGear. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
