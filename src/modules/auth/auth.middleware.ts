import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import type { UserRole } from './auth.types.js';
import { findUserById } from './auth.repository.js';

export async function requireAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (typeof payload === 'string' || !payload.sub) {
      throw new AppError(401, 'Invalid access token');
    }
    const user = await findUserById(payload.sub);
    if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');
    request.user = { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Invalid or expired access token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      next(new AppError(403, 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
