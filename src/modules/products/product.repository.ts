import { prisma } from '../../lib/prisma.js';

type ProductWhereInput = {
  category?: string;
  isAvailable?: boolean;
  price?: { gte?: number; lte?: number };
  OR?: Array<{
    name?: { contains: string; mode?: 'default' | 'insensitive' };
    description?: { contains: string; mode?: 'default' | 'insensitive' };
    sku?: { contains: string; mode?: 'default' | 'insensitive' };
  }>;
};

type ProductCreateData = {
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  isAvailable?: boolean;
};

export type ProductUpdateData = Partial<ProductCreateData>;

export type ProductListFilter = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  search?: string;
  skip: number;
  take: number;
};

export async function findProducts(filter: ProductListFilter) {
  const where: ProductWhereInput = {
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.available === undefined ? {} : { isAvailable: filter.available }),
    ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? { price: { ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}), ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}) } }
      : {}),
    ...(filter.search ? { OR: [{ name: { contains: filter.search, mode: 'insensitive' } }, { description: { contains: filter.search, mode: 'insensitive' } }, { sku: { contains: filter.search, mode: 'insensitive' } }] } : {}),
  };

  return Promise.all([
    prisma.product.findMany({ where, skip: filter.skip, take: filter.take, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export function createProduct(data: ProductCreateData) {
  return prisma.product.create({ data });
}

export function updateProduct(id: string, data: ProductUpdateData) {
  return prisma.product.update({ where: { id }, data });
}

export function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}
