import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/index.js';
import { createUserController, getUserController, listUsersController, resetPasswordController, suspendUserController, updateUserController } from './user.controller.js';

export const userRouter = Router();
userRouter.use(requireAuth, requireRole('ADMIN'));
/** @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated users }
 */
userRouter.get('/', listUsersController);
/** @openapi
 * /api/v1/users:
 *   post:
 *     tags: [Users]
 *     summary: Create an admin or reseller user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already exists }
 */
userRouter.post('/', createUserController);
/** @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User }
 *       404: { description: User not found }
 */
userRouter.get('/:id', getUserController);
/** @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User updated }
 */
userRouter.patch('/:id', updateUserController);
/** @openapi
 * /api/v1/users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset a user password
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Password reset }
 */
userRouter.post('/:id/reset-password', resetPasswordController);
/** @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Suspend a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User suspended }
 */
userRouter.delete('/:id', suspendUserController);
