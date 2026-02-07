import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';

export const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-primary-600">
              Cricket Equipment Portal
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                Welcome, {user?.fullName || user?.email}
              </span>
              <Button
                variant="secondary"
                onClick={handleLogout}
                loading={loading}
                className="w-auto"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Cricket Equipment Portal
          </h2>
          <p className="text-gray-600 mb-6">
            Your one-stop shop for all cricket equipment and gear.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              Authentication is working! You're successfully logged in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
