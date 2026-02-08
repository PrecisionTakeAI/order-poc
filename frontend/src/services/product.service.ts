import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';
import type {
  Product,
  ProductFilters,
  ProductListParams,
  ProductListResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from '../types/product.types';

class ProductService {
  private api = apiService.getAxiosInstance();

  async getProducts(params?: ProductListParams): Promise<ApiResponse<ProductListResponse>> {
    const queryParams = this.buildQueryParams(params);
    const response = await this.api.get<ApiResponse<ProductListResponse>>(
      `/products${queryParams ? `?${queryParams}` : ''}`
    );
    return response.data;
  }

  async getProduct(productId: string): Promise<ApiResponse<Product>> {
    const response = await this.api.get<ApiResponse<Product>>(`/products/${productId}`);
    return response.data;
  }

  async searchProducts(
    query: string,
    params?: Omit<ProductListParams, 'filters'>
  ): Promise<ApiResponse<ProductListResponse>> {
    const filters: ProductFilters = { search: query };
    return this.getProducts({ ...params, filters });
  }

  async filterProducts(
    filters: ProductFilters,
    params?: Omit<ProductListParams, 'filters'>
  ): Promise<ApiResponse<ProductListResponse>> {
    return this.getProducts({ ...params, filters });
  }

  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
    const requestData = {
      ...data,
      currency: 'USD',
    };
    const response = await this.api.post<ApiResponse<Product>>('/products', requestData);
    return response.data;
  }

  async updateProduct(
    productId: string,
    data: UpdateProductRequest
  ): Promise<ApiResponse<Product>> {
    const response = await this.api.put<ApiResponse<Product>>(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete<ApiResponse<void>>(`/products/${productId}`);
    return response.data;
  }

  async getUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<ApiResponse<{ uploadUrl: string; cdnUrl: string; key: string }>> {
    const response = await this.api.post<
      ApiResponse<{ uploadUrl: string; cdnUrl: string; key: string }>
    >('/products/upload-url', { fileName, contentType });
    return response.data;
  }

  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  handleError(error: unknown): string {
    return apiService.handleError(error);
  }

  private buildQueryParams(params?: ProductListParams): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    if (params.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }

    if (params.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }

    if (params.sortBy) {
      searchParams.append('sortBy', params.sortBy);
    }

    if (params.sortOrder) {
      searchParams.append('sortOrder', params.sortOrder);
    }

    if (params.filters) {
      const { category, minPrice, maxPrice, brand, inStock, search } = params.filters;

      if (category) {
        if (Array.isArray(category)) {
          category.forEach((cat) => searchParams.append('category', cat));
        } else {
          searchParams.append('category', category);
        }
      }

      if (minPrice !== undefined) {
        searchParams.append('minPrice', minPrice.toString());
      }

      if (maxPrice !== undefined) {
        searchParams.append('maxPrice', maxPrice.toString());
      }

      if (brand) {
        if (Array.isArray(brand)) {
          brand.forEach((b) => searchParams.append('brand', b));
        } else {
          searchParams.append('brand', brand);
        }
      }

      if (inStock !== undefined) {
        searchParams.append('inStock', inStock.toString());
      }

      if (search) {
        searchParams.append('search', search);
      }
    }

    return searchParams.toString();
  }
}

export const productService = new ProductService();
