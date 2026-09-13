import { api } from './http';
import type { QuotePreviewResponse } from '../types/api';

export const quoteService = {
  preview: (items: Array<{ productId: string; quantity: number }>, marginPercent?: number) =>
    api.post<QuotePreviewResponse>('/quotes/preview', { items, marginPercent }),
};
