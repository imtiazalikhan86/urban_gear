import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/index.js';
import { createOrderController, getOrderController, listOrdersController, updateOrderStatusController } from './order.controller.js';

export const orderRouter = Router();

/** @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a bulk order from product selections
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Order created }
 *       409: { description: Product unavailable }
 */
orderRouter.post('/', requireAuth, requireRole('ADMIN', 'RESELLER'), createOrderController);
/** @openapi
 * /api/v1/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated orders }
 */
orderRouter.get('/', requireAuth, requireRole('ADMIN', 'RESELLER'), listOrdersController);
/** @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Order }
 *       404: { description: Order not found }
 */
orderRouter.get('/:id', requireAuth, requireRole('ADMIN', 'RESELLER'), getOrderController);
/** @openapi
 * /api/v1/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Order status updated }
 *       403: { description: Administrator role required }
 */
orderRouter.patch('/:id/status', requireAuth, requireRole('ADMIN'), updateOrderStatusController);
