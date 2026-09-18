import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import type { UserRole } from './auth.types.js';
import { consumePasswordResetToken, createPasswordResetToken, createRefreshToken, findPasswordResetToken, findRefreshToken, findUserByEmail, findUserById, revokeRefreshToken, revokeUserRefreshTokens, rotateRefreshToken, updateUserMargin, updateUserPassword } from './auth.repository.js';
import { sendMail } from '../../lib/mailer.js';

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

  return { accessToken: createAccessToken(user), refreshToken: await issueRefreshToken(user.id), user: publicUser(user) };
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

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await findUserById(id);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'User is not available');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(401, 'Current password is incorrect');
  await updateUserPassword(id, await bcrypt.hash(newPassword, 12));
  await revokeUserRefreshTokens(id);
}

const RESET_TOKEN_BYTES = 32;

/** Only the SHA-256 digest is stored, so a database leak cannot be replayed as a reset link. */
const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Always resolves, whether or not the email matches an account, so the endpoint cannot be used
 * to discover which addresses are registered.
 */
export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user || user.status !== 'ACTIVE') return;

  const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
  await createPasswordResetToken({ userId: user.id, tokenHash: hashResetToken(token), expiresAt });

  const link = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Urban Gear password',
    text: [
      `Hello ${user.name},`,
      '',
      'Use the link below to choose a new Urban Gear password.',
      link,
      '',
      `The link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes and can only be used once.`,
      'If you did not request this, you can ignore this email; your password stays unchanged.',
    ].join('\n'),
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const record = await findPasswordResetToken(hashResetToken(token));
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now() || record.user.status !== 'ACTIVE') {
    throw new AppError(400, 'This password reset link is invalid or has expired');
  }
  await consumePasswordResetToken(record.id, record.userId, await bcrypt.hash(newPassword, 12));
  await revokeUserRefreshTokens(record.userId);
}

const REFRESH_TOKEN_BYTES = 32;

/** Only the digest is stored, so the database never holds a usable refresh token. */
const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

function refreshTokenExpiry() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000);
}

async function issueRefreshToken(userId: string) {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  await createRefreshToken({ userId, tokenHash: hashRefreshToken(token), expiresAt: refreshTokenExpiry() });
  return token;
}

/**
 * Exchanges a refresh token for a new access token, rotating the refresh token as it goes.
 * Presenting an already revoked token is treated as theft: every token for that user is revoked.
 */
export async function refreshSession(token: string) {
  const record = await findRefreshToken(hashRefreshToken(token));
  if (!record) throw new AppError(401, 'Invalid refresh token');

  if (record.revokedAt) {
    await revokeUserRefreshTokens(record.userId);
    throw new AppError(401, 'Refresh token has already been used');
  }
  if (record.expiresAt.getTime() <= Date.now() || record.user.status !== 'ACTIVE') {
    await revokeRefreshToken(record.id);
    throw new AppError(401, 'Refresh token has expired');
  }

  const nextToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  await rotateRefreshToken(record.id, {
    userId: record.userId,
    tokenHash: hashRefreshToken(nextToken),
    expiresAt: refreshTokenExpiry(),
  });

  const user = { ...record.user, role: record.user.role as UserRole, status: record.user.status as 'ACTIVE' | 'SUSPENDED' };
  return { accessToken: createAccessToken(user), refreshToken: nextToken, user: publicUser(user) };
}

export async function logout(token: string) {
  const record = await findRefreshToken(hashRefreshToken(token));
  if (record && !record.revokedAt) await revokeRefreshToken(record.id);
}
