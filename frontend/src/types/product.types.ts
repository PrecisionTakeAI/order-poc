export type ProductCategory =
  | 'bats'
  | 'pads'
  | 'gloves'
  | 'helmets'
  | 'balls'
  | 'shoes'
  | 'bags'
  | 'protection'
  | 'accessories';

export const PRODUCT_CATEGORIES: Array<{ value: ProductCategory; label: string }> = [
  { value: 'bats', label: 'Bats' },
  { value: 'pads', label: 'Pads' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'helmets', label: 'Helmets' },
  { value: 'balls', label: 'Balls' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bags', label: 'Bags' },
  { value: 'protection', label: 'Protective Gear' },
  { value: 'accessories', label: 'Accessories' },
];

export interface Product {
  productId: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  stock: number;
  imageUrl?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: ProductCategory | ProductCategory[];
  minPrice?: number;
  maxPrice?: number;
  brand?: string | string[];
  inStock?: boolean;
  search?: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'name' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filters?: ProductFilters;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  stock: number;
  imageUrl?: string;
  brand?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: ProductCategory;
  price?: number;
  stock?: number;
  imageUrl?: string;
  brand?: string;
}
