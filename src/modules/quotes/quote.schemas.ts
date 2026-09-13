import { z } from 'zod';

export const quotePreviewSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(1000).optional(),
  items: z.array(z.object({
    productId: z.uuid(),
    quantity: z.coerce.number().int().positive().max(100000),
  })).min(1).max(100),
});
