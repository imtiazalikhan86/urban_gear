import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const marginSchema = z.object({
  marginPercent: z.coerce.number().min(0).max(1000),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
}).refine((input) => input.currentPassword !== input.newPassword, {
  message: 'The new password must be different from the current password',
  path: ['newPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(400),
  newPassword: z.string().min(12).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20).max(400),
});
