import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface CartDrawerContextType {
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextType | undefined>(undefined);

interface CartDrawerProviderProps {
  children: ReactNode;
}

export const CartDrawerProvider: React.FC<CartDrawerProviderProps> = ({ children }) => {
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  return (
    <CartDrawerContext.Provider value={{ isCartDrawerOpen, openCartDrawer, closeCartDrawer }}>
      {children}
    </CartDrawerContext.Provider>
  );
};

export const useCartDrawer = (): CartDrawerContextType => {
  const context = useContext(CartDrawerContext);
  if (!context) {
    throw new Error('useCartDrawer must be used within a CartDrawerProvider');
  }
  return context;
};
