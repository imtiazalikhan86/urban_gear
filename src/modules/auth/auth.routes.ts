import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../shared/async-handler.js';
import { requireAuth } from './auth.middleware.js';
import { loginController, meController, updateMarginController } from './auth.controller.js';

export const authRouter = Router();

const loginRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
});

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate a reseller or administrator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200: { description: Authenticated }
 *       401: { description: Invalid credentials }
 */
authRouter.post('/login', loginRateLimiter, asyncHandler(loginController));

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Authentication required }
 */
authRouter.get('/me', requireAuth, asyncHandler(meController));

/**
 * @openapi
 * /api/v1/auth/me/margin:
 *   patch:
 *     tags: [Authentication]
 *     summary: Save the authenticated user's margin percentage
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Margin updated }
 *       400: { description: Invalid margin }
 */
authRouter.patch('/me/margin', requireAuth, asyncHandler(updateMarginController));
