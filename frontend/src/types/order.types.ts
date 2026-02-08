import type { Product } from './product.types';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

export interface ShippingFormData {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  orderId: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  orderDate: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  trackingNumber?: string;
}

export interface OrderListResponse {
  orders: Order[];
  count: number;
  hasMore: boolean;
  lastKey?: string;
  // Legacy fields for backward compatibility
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// Admin-specific types
export interface AdminOrder {
  orderId: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  orderDate?: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus?: string;
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
}

export interface AdminOrderListResponse {
  orders: AdminOrder[];
  count: number;
  hasMore: boolean;
  lastKey?: string;
  statistics: OrderStatistics;
}

export interface AdminOrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  lastKey?: string;
}
