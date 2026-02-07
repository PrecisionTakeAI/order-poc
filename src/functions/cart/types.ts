export interface AddItemRequest {
  productId: string;
  quantity: number;
}

export interface UpdateItemRequest {
  quantity: number;
}

export interface CurrentProductInfo {
  name: string;
  price: number;
  stock: number;
  status: string;
  imageUrl?: string;
}

export interface CartItemResponse {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  currentProduct?: CurrentProductInfo | null;
}

export interface CartResponse {
  userId: string;
  items: CartItemResponse[];
  totalAmount: number;
  currency: string;
  itemCount: number;
  updatedAt: string;
}
