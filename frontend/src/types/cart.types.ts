import type { Product } from './product.types';

export interface CartItem {
  itemId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
  addedAt: string;
}

export interface Cart {
  cartId: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
