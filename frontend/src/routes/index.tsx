import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '../components/common/PrivateRoute';
import { AdminRoute } from '../components/common/AdminRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { LoadingSkeleton } from '../components/layout/LoadingSkeleton';

// Auth pages (no layout wrapper)
const LoginPage = React.lazy(() =>
  import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = React.lazy(() =>
  import('../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = React.lazy(() =>
  import('../pages/auth/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = React.lazy(() =>
  import('../pages/auth/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);

// Public/protected pages
const HomePage = React.lazy(() =>
  import('../pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const ProductsPage = React.lazy(() =>
  import('../pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const ProductDetailPage = React.lazy(() =>
  import('../pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CartPage = React.lazy(() =>
  import('../pages/CartPage').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = React.lazy(() =>
  import('../pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrdersPage = React.lazy(() =>
  import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const OrderDetailPage = React.lazy(() =>
  import('../pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage }))
);

// Admin pages
const AdminDashboardPage = React.lazy(() =>
  import('../pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);

// Error/utility pages
const AccessDeniedPage = React.lazy(() =>
  import('../pages/AccessDeniedPage').then((m) => ({ default: m.AccessDeniedPage }))
);
const NotFoundPage = React.lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        {/* Auth pages (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Access denied (no layout) */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Protected pages with MainLayout */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
