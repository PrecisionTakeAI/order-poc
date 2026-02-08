import { Address } from '../../shared/types';

export interface CreateOrderRequest {
  shippingAddress: Address;
  paymentMethod: string;
  idempotencyKey?: string;
}

export interface UpdateOrderStatusRequest {
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface OrderItemResponse {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderResponse {
  orderId: string;
  userId: string;
  items: OrderItemResponse[];
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  shippingAddress?: Address;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: OrderResponse[];
  count: number;
  hasMore: boolean;
}
