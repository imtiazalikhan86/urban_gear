import type { Request, Response } from 'express';
import { loginSchema, marginSchema } from './auth.schemas.js';
import { getCurrentUser, login, setMargin } from './auth.service.js';

export async function loginController(request: Request, response: Response): Promise<void> {
  const input = loginSchema.parse(request.body);
  response.json({ data: await login(input.email, input.password) });
}

export async function meController(request: Request, response: Response): Promise<void> {
  response.json({ data: await getCurrentUser(request.user!.id) });
}

export async function updateMarginController(request: Request, response: Response): Promise<void> {
  const { marginPercent } = marginSchema.parse(request.body);
  response.json({ data: await setMargin(request.user!.id, marginPercent) });
}
