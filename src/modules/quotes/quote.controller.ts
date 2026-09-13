import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/async-handler.js';
import { quotePreviewSchema } from './quote.schemas.js';
import { previewQuote } from './quote.service.js';

export const previewQuoteController = asyncHandler(async (request: Request, response: Response) => {
  const input = quotePreviewSchema.parse(request.body);
  response.json(await previewQuote(request.user!.id, input));
});
