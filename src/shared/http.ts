import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { AppError } from './errors.js';

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.path} not found` },
  });
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (response.headersSent) {
    logger.error({ error }, 'Request failed after the response had started');
    response.end();
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues } });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: { code: 'APPLICATION_ERROR', message: error.message, details: error.details } });
    return;
  }

  logger.error({ error }, 'Unhandled application error');
  response.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } });
}
