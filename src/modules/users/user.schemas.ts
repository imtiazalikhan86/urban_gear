import { z } from 'zod';

const roleSchema = z.enum(['ADMIN', 'RESELLER']);
const statusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

export const userIdParamsSchema = z.object({ id: z.uuid() });

export const userListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: roleSchema.default('RESELLER'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email().transform((value) => value.toLowerCase()).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
}).refine((user) => Object.keys(user).length > 0, {
  message: 'At least one user field is required',
});

export const resetPasswordSchema = z.object({
  password: z.string().min(12).max(128),
});
