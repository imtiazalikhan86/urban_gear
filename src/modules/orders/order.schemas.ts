import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive().max(100000),
});

export const createOrderSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(1000).optional(),
  items: z.array(orderItemSchema).min(1).max(100).superRefine((items, context) => {
    const ids = new Set<string>();
    items.forEach((item, index) => {
      if (ids.has(item.productId)) context.addIssue({ code: 'custom', path: [index, 'productId'], message: 'Duplicate product items must be combined' });
      ids.add(item.productId);
    });
  }),
});

export const orderIdParamsSchema = z.object({ id: z.uuid() });
export const orderListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const updateOrderStatusSchema = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED']) });
