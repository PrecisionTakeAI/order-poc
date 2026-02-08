export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  status?: 'active' | 'inactive' | 'out_of_stock';
}

export interface ProductResponse {
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: ProductResponse[];
  count: number;
  lastKey: string | null;
  hasMore: boolean;
}

export interface SearchProductsResponse extends ProductListResponse {
  query: string;
}

export interface CategoryProductsResponse extends ProductListResponse {
  category: string;
  priceRange: {
    min?: number;
    max?: number;
  } | null;
}

export type SortBy = 'price-asc' | 'price-desc' | 'newest';

export interface ListProductsOptions {
  limit: number;
  lastKey?: string;
  sortBy?: SortBy;
}

export interface SearchProductsOptions {
  query: string;
  limit: number;
  lastKey?: string;
}

export interface CategoryQueryOptions {
  category: string;
  minPrice?: number;
  maxPrice?: number;
  limit: number;
  lastKey?: string;
}

export interface ProductListResult {
  products: import('../../shared/types').ProductEntity[];
  lastEvaluatedKey: Record<string, unknown> | undefined;
}

export interface GenerateUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  cdnUrl: string;
  key: string;
}
