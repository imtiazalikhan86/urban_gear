import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../shared/async-handler.js';
import { requireAuth } from './auth.middleware.js';
import { forgotPasswordController, loginController, logoutController, meController, refreshController, resetPasswordController, updateMarginController, updatePasswordController } from './auth.controller.js';

export const authRouter = Router();

const loginRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
});

const passwordResetRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
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

/**
 * @openapi
 * /api/v1/auth/me/password:
 *   patch:
 *     tags: [Authentication]
 *     summary: Change the authenticated user's own password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 12 }
 *     responses:
 *       204: { description: Password changed }
 *       400: { description: The new password is invalid or matches the current one }
 *       401: { description: The current password is incorrect }
 */
authRouter.patch('/me/password', requireAuth, asyncHandler(updatePasswordController));

/**
 * @openapi
 * /api/v1/auth/password/forgot:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a password reset link
 *     description: Always returns 202 so the endpoint cannot be used to discover registered email addresses. Rate limited to 5 requests per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       202: { description: Accepted, whether or not the email matches an account }
 *       429: { description: Too many reset requests }
 */
authRouter.post('/password/forgot', passwordResetRateLimiter, asyncHandler(forgotPasswordController));

/**
 * @openapi
 * /api/v1/auth/password/reset:
 *   post:
 *     tags: [Authentication]
 *     summary: Set a new password using an emailed reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, format: password, minLength: 12 }
 *     responses:
 *       204: { description: Password reset }
 *       400: { description: The token is invalid, used, or expired, or the password is too short }
 *       429: { description: Too many reset attempts }
 */
authRouter.post('/password/reset', passwordResetRateLimiter, asyncHandler(resetPasswordController));

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Exchange a refresh token for a new access token
 *     description: Rotates the refresh token. Reusing a revoked token revokes every refresh token for that user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New access token and rotated refresh token }
 *       401: { description: The refresh token is invalid, expired, or already used }
 */
authRouter.post('/refresh', asyncHandler(refreshController));

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204: { description: Refresh token revoked }
 */
authRouter.post('/logout', asyncHandler(logoutController));
