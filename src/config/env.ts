import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().min(1).default('urbangear-api'),
  JWT_AUDIENCE: z.string().min(1).default('urbangear-clients'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().max(1440).default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
  MAIL_FROM: z.string().default('Urban Gear <no-reply@urbangear.local>'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true').default(false),
}).superRefine((config, context) => {
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.includes('change')) {
    context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET must be rotated in production' });
  }
  if (config.NODE_ENV === 'production' && config.CORS_ORIGIN.includes('localhost')) {
    context.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'CORS_ORIGIN must not use localhost in production' });
  }
  if (config.NODE_ENV === 'production' && !config.SMTP_HOST) {
    context.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'SMTP_HOST is required in production so password reset emails are delivered' });
  }
});

export const env = envSchema.parse(process.env);
