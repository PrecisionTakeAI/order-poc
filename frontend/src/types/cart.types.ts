export interface CartItem {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  currentProduct?: {
    name: string;
    price: number;
    stock: number;
    status: string;
    imageUrl?: string;
  } | null;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  itemCount: number;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartContextType {
  // State
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  // Computed values
  itemCount: number;
  totalAmount: number;
  currency: string;

  // Actions
  addToCart: (request: AddToCartRequest) => Promise<void>;
  updateCartItem: (itemId: string, request: UpdateCartItemRequest) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refetchCart: () => Promise<void>;

  // Action loading states
  addLoading: boolean;
  updateLoading: boolean;
  removeLoading: boolean;
}
