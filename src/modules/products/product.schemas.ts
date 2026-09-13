import { z } from 'zod';

export const productIdParamsSchema = z.object({ id: z.uuid() });

const productFields = {
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  description: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(80),
  price: z.coerce.number().nonnegative(),
  currency: z.string().length(3).toUpperCase().default('INR'),
  imageUrl: z.url().nullable().optional(),
  isAvailable: z.boolean().default(true),
};

export const createProductSchema = z.object(productFields);
export const updateProductSchema = z.object(productFields).partial().refine((product) => Object.keys(product).length > 0, {
  message: 'At least one product field is required',
});

export const productListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  available: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine((query) => query.maxPrice === undefined || query.minPrice === undefined || query.maxPrice >= query.minPrice, {
  message: 'maxPrice must be greater than or equal to minPrice',
  path: ['maxPrice'],
});
