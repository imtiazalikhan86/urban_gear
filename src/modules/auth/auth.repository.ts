import { prisma } from '../../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function updateUserMargin(id: string, marginPercent: number) {
  return prisma.user.update({ where: { id }, data: { marginPercent } });
}

export function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}


export function createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data });
}

export function findPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
}

/** Applies the new password and burns every outstanding token for that user in one transaction. */
export function consumePasswordResetToken(id: string, userId: string, passwordHash: string) {
  const usedAt = new Date();
  return prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt } }),
  ]);
}

export function createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.refreshToken.create({ data });
}

export function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
}

/** Rotation: the presented token is revoked and its replacement stored in one transaction. */
export function rotateRefreshToken(id: string, next: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.$transaction([
    prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }),
    prisma.refreshToken.create({ data: next }),
  ]);
}

export function revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
}

/** Used on logout-everywhere, password change, password reset, and refresh-token reuse. */
export function revokeUserRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
