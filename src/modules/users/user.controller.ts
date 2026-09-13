import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { createUserSchema, resetPasswordSchema, updateUserSchema, userIdParamsSchema, userListQuerySchema } from './user.schemas.js';
import { createUser, getUser, listUsers, resetPassword, suspendUser, updateUser } from './user.service.js';

export const listUsersController = asyncHandler(async (request: Request, response: Response) => response.json(await listUsers(userListQuerySchema.parse(request.query))));
export const getUserController = asyncHandler(async (request: Request, response: Response) => response.json({ data: await getUser(userIdParamsSchema.parse(request.params).id) }));
export const createUserController = asyncHandler(async (request: Request, response: Response) => response.status(201).json({ data: await createUser(createUserSchema.parse(request.body)) }));
export const updateUserController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = userIdParamsSchema.parse(request.params);
  response.json({ data: await updateUser(id, request.user!.id, updateUserSchema.parse(request.body)) });
});
export const resetPasswordController = asyncHandler(async (request: Request, response: Response) => {
  await resetPassword(userIdParamsSchema.parse(request.params).id, resetPasswordSchema.parse(request.body).password);
  response.status(204).send();
});
export const suspendUserController = asyncHandler(async (request: Request, response: Response) => {
  const { id } = userIdParamsSchema.parse(request.params);
  response.json({ data: await suspendUser(id, request.user!.id) });
});
