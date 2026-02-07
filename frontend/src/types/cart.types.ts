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
