import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/index.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { createProductController, deleteProductController, getProductController, listProductsController, updateProductController } from './product.controller.js';

export const productRouter = Router();

/** @openapi
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: List products
 *     description: Authenticated administrators and resellers only; the price is the reseller cost price.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated products }
 */
productRouter.get('/', requireAuth, requireRole('ADMIN', 'RESELLER'), asyncHandler(listProductsController));
/** @openapi
 * /api/v1/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product
 *     description: Authenticated administrators and resellers only; the price is the reseller cost price.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Product }
 *       404: { description: Product not found }
 */
productRouter.get('/:id', requireAuth, requireRole('ADMIN', 'RESELLER'), asyncHandler(getProductController));
/** @openapi
 * /api/v1/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Product created }
 *       403: { description: Administrator role required }
 */
productRouter.post('/', requireAuth, requireRole('ADMIN'), asyncHandler(createProductController));
/** @openapi
 * /api/v1/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Product updated }
 */
productRouter.patch('/:id', requireAuth, requireRole('ADMIN'), asyncHandler(updateProductController));
/** @openapi
 * /api/v1/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Product deleted }
 */
productRouter.delete('/:id', requireAuth, requireRole('ADMIN'), asyncHandler(deleteProductController));
