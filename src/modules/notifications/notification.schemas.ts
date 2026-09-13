import { z } from 'zod';

export const notificationIdParamsSchema = z.object({ id: z.uuid() });
export const notificationListQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).transform((value) => value === 'true').default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
