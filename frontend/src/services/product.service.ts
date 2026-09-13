import { api } from './http';
import type { Product, ProductListResponse } from '../types/api';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductCreateInput {
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export const productService = {
  list: (filters: ProductFilters = {}) => api.get<ProductListResponse>('/products', filters),
  get: (id: string) => api.get<{ data: Product }>(`/products/${id}`),
  create: (product: ProductCreateInput) => api.post<{ data: Product }>('/products', product),
  update: (id: string, product: Partial<Product>) => api.patch<{ data: Product }>(`/products/${id}`, product),
  remove: (id: string) => api.delete<void>(`/products/${id}`),
};
