import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartDrawerProvider, useCartDrawer } from './context/CartDrawerContext';
import { ToastContainer } from './components/common';
import { CartDrawer } from './components/cart';
import { AppRoutes } from './routes';

const AppContent: React.FC = () => {
  const { isCartDrawerOpen, closeCartDrawer } = useCartDrawer();

  return (
    <>
      <AppRoutes />
      <ToastContainer />
      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartDrawerProvider>
            <AppContent />
          </CartDrawerProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
