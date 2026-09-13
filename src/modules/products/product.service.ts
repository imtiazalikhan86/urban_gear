import { AppError } from '../../shared/errors.js';
import { createProduct as insertProduct, deleteProduct as removeProduct, findProductById, findProducts, updateProduct as reviseProduct } from './product.repository.js';
import type { ProductUpdateData } from './product.repository.js';
import type { z } from 'zod';
import type { productListQuerySchema } from './product.schemas.js';
import { fanOutProductNotifications } from '../notifications/notification.service.js';
import { findActiveResellerIds } from '../users/user.repository.js';

export async function listProducts(query: z.infer<typeof productListQuerySchema>) {
  const skip = (query.page - 1) * query.pageSize;
  const [products, total] = await findProducts({ ...query, skip, take: query.pageSize });

  return {
    data: products,
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

export async function getProduct(id: string) {
  const product = await findProductById(id);
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export async function createProduct(input: { sku: string; name: string; slug: string; description: string; category: string; price: number; currency: string; imageUrl?: string | null; isAvailable: boolean }) {
  const product = await insertProduct(input);
  const resellerIds = await findActiveResellerIds();
  await fanOutProductNotifications(resellerIds, product);
  return product;
}

export async function updateProduct(id: string, input: ProductUpdateData) {
  await getProduct(id);
  return reviseProduct(id, input);
}

export async function deleteProduct(id: string) {
  await getProduct(id);
  await removeProduct(id);
}
