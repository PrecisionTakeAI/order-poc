import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';
import type {
  Order,
  OrderListResponse,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  AdminOrderListResponse,
  AdminOrderFilters,
} from '../types/order.types';

class OrderService {
  private api = apiService.getAxiosInstance();

  async createOrder(request: CreateOrderRequest): Promise<ApiResponse<Order>> {
    const response = await this.api.post<ApiResponse<Order>>('/orders', request);
    return response.data;
  }

  async getOrders(
    limit: number = 10,
    status?: string,
    lastKey?: string
  ): Promise<ApiResponse<OrderListResponse>> {
    const params = new URLSearchParams({ limit: limit.toString() });

    if (status && status !== 'all') {
      params.append('status', status);
    }

    if (lastKey) {
      params.append('lastKey', lastKey);
    }

    const response = await this.api.get<ApiResponse<OrderListResponse>>(
      `/orders?${params.toString()}`
    );
    return response.data;
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    const response = await this.api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest
  ): Promise<ApiResponse<Order>> {
    const response = await this.api.put<ApiResponse<Order>>(`/orders/${orderId}/status`, request);
    return response.data;
  }

  // Admin methods
  async getAdminOrders(filters?: AdminOrderFilters): Promise<ApiResponse<AdminOrderListResponse>> {
    const params = new URLSearchParams();

    if (filters?.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }

    if (filters?.status) {
      params.append('status', filters.status);
    }

    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }

    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    if (filters?.lastKey) {
      params.append('lastKey', filters.lastKey);
    }

    const queryString = params.toString();
    const url = queryString ? `/admin/orders?${queryString}` : '/admin/orders';

    const response = await this.api.get<ApiResponse<AdminOrderListResponse>>(url);
    return response.data;
  }

  async updateOrderStatusAdmin(
    orderId: string,
    status: string
  ): Promise<ApiResponse<Order>> {
    const response = await this.api.put<ApiResponse<Order>>(
      `/admin/orders/${orderId}/status`,
      { status }
    );
    return response.data;
  }

  handleError(error: unknown): string {
    return apiService.handleError(error);
  }
}

export const orderService = new OrderService();
