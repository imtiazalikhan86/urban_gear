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
