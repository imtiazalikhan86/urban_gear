import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const marginSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(1000),
});
