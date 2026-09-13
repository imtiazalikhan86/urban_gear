import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import type { UserRole } from './auth.types.js';
import { findUserByEmail, findUserById, updateUserMargin } from './auth.repository.js';

type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
};

function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function createAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches || user.status !== 'ACTIVE') {
    throw new AppError(401, 'Invalid email or password');
  }

  return { accessToken: createAccessToken(user), user: publicUser(user) };
}

export async function getCurrentUser(id: string) {
  const user = await findUserById(id);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');
  return { ...publicUser(user), marginPercent: Number(user.marginPercent) };
}

export async function setMargin(id: string, marginPercent: number) {
  const user = await findUserById(id);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');
  const updatedUser = await updateUserMargin(id, marginPercent);
  return { ...publicUser(updatedUser), marginPercent: Number(updatedUser.marginPercent) };
}
