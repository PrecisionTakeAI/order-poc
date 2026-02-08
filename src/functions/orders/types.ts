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
  currentImageUrl?: string;
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
  lastKey?: string;
}

export interface GetUserOrdersParams {
  userId: string;
  limit?: number;
  lastKey?: Record<string, unknown>;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

export interface GetUserOrdersResult {
  orders: any[];
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface AdminOrderResponse extends OrderResponse {
  customerName?: string;
  customerEmail?: string;
  orderDate?: string;
}

export interface AdminOrderListResponse {
  orders: AdminOrderResponse[];
  count: number;
  hasMore: boolean;
  lastKey?: string;
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<string, number>;
  };
}
