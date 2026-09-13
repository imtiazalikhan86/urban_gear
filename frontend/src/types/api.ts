export type UserRole = 'ADMIN' | 'RESELLER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  marginPercent?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: string;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  data: Product[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface LoginResponse {
  data: { accessToken: string; user: User };
}

export interface QuotePreviewResponse {
  data: {
    items: Array<{ productId: string; productName: string; quantity: number; customerUnitPrice: number; customerLineTotal: number }>;
    currency: string;
    marginPercent: number;
    total: number;
  };
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  marginPercent: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{ productId: string; productName: string; sku: string; quantity: number; customerUnitPrice: number; lineTotal: number }>;
}

export interface OrderListResponse {
  data: Order[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
