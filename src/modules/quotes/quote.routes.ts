import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/index.js';
import { previewQuoteController } from './quote.controller.js';

export const quoteRouter = Router();

/**
 * @openapi
 * /api/v1/quotes/preview:
 *   post:
 *     tags: [Quotes]
 *     summary: Preview customer pricing before placing an order
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Customer-facing quote preview }
 *       400: { description: Invalid quote request }
 *       404: { description: Product not found }
 */
quoteRouter.post('/preview', requireAuth, requireRole('ADMIN', 'RESELLER'), previewQuoteController);
