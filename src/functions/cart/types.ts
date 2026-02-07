export interface AddItemRequest {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface UpdateItemRequest {
  quantity: number;
}

export interface CartItemResponse {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  userId: string;
  items: CartItemResponse[];
  totalAmount: number;
  currency: string;
  updatedAt: string;
}
