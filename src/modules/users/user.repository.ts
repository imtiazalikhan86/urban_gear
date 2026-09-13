import { prisma } from '../../lib/prisma.js';

type UserWhereInput = {
  OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>;
  role?: 'ADMIN' | 'RESELLER';
  status?: 'ACTIVE' | 'SUSPENDED';
};

export type UserUpdateData = {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'RESELLER';
  status?: 'ACTIVE' | 'SUSPENDED';
  passwordHash?: string;
};

export function findUsers(where: UserWhereInput, skip: number, take: number) {
  return Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function insertUser(data: { name: string; email: string; passwordHash: string; role: 'ADMIN' | 'RESELLER' }) {
  return prisma.user.create({ data });
}

export function updateUser(id: string, data: UserUpdateData) {
  return prisma.user.update({ where: { id }, data });
}

export function countActiveAdmins() {
  return prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
}

export async function findActiveResellerIds(): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { role: 'RESELLER', status: 'ACTIVE' }, select: { id: true } });
  return users.map((user) => user.id);
}
