import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from '../types/cart.types';

class CartService {
  private api = apiService.getAxiosInstance();

  async getCart(): Promise<ApiResponse<Cart>> {
    const response = await this.api.get<ApiResponse<Cart>>('/cart');
    return response.data;
  }

  async addToCart(request: AddToCartRequest): Promise<ApiResponse<Cart>> {
    const response = await this.api.post<ApiResponse<Cart>>('/cart', request);
    return response.data;
  }

  async updateCartItem(
    productId: string,
    request: UpdateCartItemRequest
  ): Promise<ApiResponse<Cart>> {
    const response = await this.api.put<ApiResponse<Cart>>(`/cart/${productId}`, request);
    return response.data;
  }

  async removeFromCart(productId: string): Promise<ApiResponse<Cart>> {
    const response = await this.api.delete<ApiResponse<Cart>>(`/cart/${productId}`);
    return response.data;
  }

  async clearCart(): Promise<ApiResponse<void>> {
    const response = await this.api.delete<ApiResponse<void>>('/cart');
    return response.data;
  }

  handleError(error: unknown): string {
    return apiService.handleError(error);
  }
}

export const cartService = new CartService();
