import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const admin = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  passwordHash: await bcrypt.hash('admin-password', 4),
  name: 'Admin User',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const reseller = { ...admin, id: '22222222-2222-4222-8222-222222222222', email: 'reseller@example.com', role: 'RESELLER' };

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn((email: string) => Promise.resolve(email === admin.email ? admin : email === reseller.email ? reseller : null)),
  findUserById: vi.fn((id: string) => Promise.resolve(id === admin.id ? admin : id === reseller.id ? reseller : null)),
}));

vi.mock('../src/modules/users/user.repository.js', () => ({
  findUsers: vi.fn().mockResolvedValue([[admin], 1]),
  findUserById: vi.fn((id: string) => Promise.resolve(id === admin.id ? admin : null)),
  findUserByEmail: vi.fn().mockResolvedValue(null),
  insertUser: vi.fn().mockImplementation((input: object) => Promise.resolve({ ...reseller, ...input, passwordHash: 'hashed' })),
  updateUser: vi.fn().mockImplementation((id: string, input: object) => Promise.resolve({ ...admin, id, ...input })),
  countActiveAdmins: vi.fn().mockResolvedValue(2),
}));

const { app } = await import('../src/app.js');

async function login(email: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password: 'admin-password' });
  return response.body.data.accessToken as string;
}

describe('user management API', () => {
  it('allows an admin to create a reseller without returning a password', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${await login(admin.email)}`)
      .send({ name: 'New Reseller', email: 'new@example.com', password: 'strong-reseller-password', role: 'RESELLER' });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe('RESELLER');
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('denies reseller access to user management', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${await login(reseller.email)}`);

    expect(response.status).toBe(403);
  });

  it('prevents an administrator from suspending themselves', async () => {
    const response = await request(app)
      .delete(`/api/v1/users/${admin.id}`)
      .set('Authorization', `Bearer ${await login(admin.email)}`);

    expect(response.status).toBe(400);
  });
});
