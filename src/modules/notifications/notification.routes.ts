import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/index.js';
import { listNotificationsController, markNotificationReadController, streamNotificationsController } from './notification.controller.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth, requireRole('ADMIN', 'RESELLER'));
/** @openapi
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the authenticated user's product notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated notifications }
 */
notificationRouter.get('/', listNotificationsController);
/** @openapi
 * /api/v1/notifications/stream:
 *   get:
 *     tags: [Notifications]
 *     summary: Stream notifications in real time over Server-Sent Events
 *     description: Emits a `ready` event with the unread count, then a `notification` event per new product alert, with periodic heartbeat comments.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Server-Sent Events stream, content: { text/event-stream: { schema: { type: string } } } }
 */
notificationRouter.get('/stream', streamNotificationsController);
/** @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Notification marked read }
 */
notificationRouter.patch('/:id/read', markNotificationReadController);
