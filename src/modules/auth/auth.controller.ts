import type { Request, Response } from 'express';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, marginSchema, refreshTokenSchema, resetPasswordSchema } from './auth.schemas.js';
import { changePassword, getCurrentUser, login, logout, refreshSession, requestPasswordReset, resetPasswordWithToken, setMargin } from './auth.service.js';

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

export async function updatePasswordController(request: Request, response: Response): Promise<void> {
  const input = changePasswordSchema.parse(request.body);
  await changePassword(request.user!.id, input.currentPassword, input.newPassword);
  response.status(204).send();
}

export async function forgotPasswordController(request: Request, response: Response): Promise<void> {
  await requestPasswordReset(forgotPasswordSchema.parse(request.body).email);
  response.status(202).json({ data: { message: 'If that email matches an account, a reset link is on its way.' } });
}

export async function resetPasswordController(request: Request, response: Response): Promise<void> {
  const input = resetPasswordSchema.parse(request.body);
  await resetPasswordWithToken(input.token, input.newPassword);
  response.status(204).send();
}

export async function refreshController(request: Request, response: Response): Promise<void> {
  const { refreshToken } = refreshTokenSchema.parse(request.body);
  response.json({ data: await refreshSession(refreshToken) });
}

export async function logoutController(request: Request, response: Response): Promise<void> {
  const { refreshToken } = refreshTokenSchema.parse(request.body);
  await logout(refreshToken);
  response.status(204).send();
}
