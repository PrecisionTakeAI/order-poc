export interface BaseEntity {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEntity extends BaseEntity {
  PK: `USER#${string}`;
  SK: 'PROFILE';
  userId: string;
  email: string;
  cognitoSub: string;
  fullName?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface ProductEntity extends BaseEntity {
  PK: `PRODUCT#${string}`;
  SK: 'DETAILS';
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
}

export interface CartEntity extends BaseEntity {
  PK: `USER#${string}`;
  SK: 'CART';
  userId: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  version: number;
}

export interface CartItem {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderEntity extends BaseEntity {
  PK: `USER#${string}`;
  SK: `ORDER#${string}`;
  orderId: string;
  userId: string;
  orderDate: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: Address;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface OrderItem {
  itemId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  currentImageUrl?: string;
}

export interface Address {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
