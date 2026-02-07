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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold text-primary-600">Cricket Equipment Portal</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user?.fullName || user?.email}</span>
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

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Welcome to Cricket Equipment Portal
          </h2>
          <p className="mb-6 text-gray-600">
            Your one-stop shop for all cricket equipment and gear.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Authentication is working! You're successfully logged in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
