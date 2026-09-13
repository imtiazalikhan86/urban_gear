import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors.js';
import type { UserRole } from '../auth/auth.types.js';
import { countActiveAdmins, findUserByEmail, findUserById, findUsers, insertUser, updateUser as persistUser } from './user.repository.js';

type UserStatus = 'ACTIVE' | 'SUSPENDED';

type UserRecord = { id: string; name: string; email: string; role: UserRole; status: UserStatus; createdAt: Date; updatedAt: Date };

function publicUser(user: UserRecord) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export async function listUsers(query: { search?: string; role?: UserRole; status?: UserStatus; page: number; pageSize: number }) {
  const where = {
    ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { email: { contains: query.search, mode: 'insensitive' as const } }] } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [users, total] = await findUsers(where, (query.page - 1) * query.pageSize, query.pageSize);
  return { data: users.map(publicUser), meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}

export async function getUser(id: string) {
  const user = await findUserById(id);
  if (!user) throw new AppError(404, 'User not found');
  return publicUser(user);
}

export async function createUser(input: { name: string; email: string; password: string; role: UserRole }) {
  if (await findUserByEmail(input.email)) throw new AppError(409, 'A user with this email already exists');
  const user = await insertUser({ name: input.name, email: input.email, role: input.role, passwordHash: await bcrypt.hash(input.password, 12) });
  return publicUser(user);
}

export async function updateUser(id: string, actorId: string, input: { name?: string; email?: string; role?: UserRole; status?: UserStatus }) {
  const existing = await findUserById(id);
  if (!existing) throw new AppError(404, 'User not found');
  if (id === actorId && (input.role || input.status === 'SUSPENDED')) throw new AppError(400, 'You cannot change your own role or suspend yourself');
  if (input.email && input.email !== existing.email && await findUserByEmail(input.email)) throw new AppError(409, 'A user with this email already exists');
  if (existing.role === 'ADMIN' && existing.status === 'ACTIVE' && (input.role === 'RESELLER' || input.status === 'SUSPENDED') && await countActiveAdmins() <= 1) {
    throw new AppError(400, 'At least one active administrator is required');
  }
  return publicUser(await persistUser(id, input));
}

export async function resetPassword(id: string, password: string) {
  if (!await findUserById(id)) throw new AppError(404, 'User not found');
  await persistUser(id, { passwordHash: await bcrypt.hash(password, 12) });
}

export async function suspendUser(id: string, actorId: string) {
  return updateUser(id, actorId, { status: 'SUSPENDED' });
}
