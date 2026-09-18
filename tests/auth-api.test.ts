import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../src/config/env.js';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const admin = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  passwordHash: await bcrypt.hash('admin-password', 4),
  name: 'Admin User',
  role: 'ADMIN',
  status: 'ACTIVE',
};
const reseller = { ...admin, id: '22222222-2222-4222-8222-222222222222', email: 'reseller@example.com', role: 'RESELLER' };

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn((email: string) => Promise.resolve(email === admin.email ? admin : email === reseller.email ? reseller : null)),
  findUserById: vi.fn((id: string) => Promise.resolve(id === admin.id ? admin : id === reseller.id ? reseller : null)),
  updateUserPassword: vi.fn().mockResolvedValue(admin),
  updateUserMargin: vi.fn().mockResolvedValue({ ...admin, marginPercent: 0 }),
  createRefreshToken: vi.fn().mockResolvedValue({ id: 'refresh-id' }),
  revokeUserRefreshTokens: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock('../src/modules/products/product.repository.js', () => ({
  findProducts: vi.fn().mockResolvedValue([[], 0]),
  findProductById: vi.fn().mockResolvedValue(null),
  createProduct: vi.fn().mockResolvedValue({ id: 'product-id', name: 'New Product' }),
}));

const { app } = await import('../src/app.js');

describe('authentication and authorization', () => {
  it('logs in and returns an access token', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: 'admin-password' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('ADMIN');
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: 'wrong-password' });

    expect(response.status).toBe(401);
  });

  it('allows only admins to create products', async () => {
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ email: reseller.email, password: 'admin-password' });
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .send({ sku: 'UG-001', name: 'Product', slug: 'product', description: 'Description', category: 'Bags', price: 100, currency: 'INR' });

    expect(response.status).toBe(403);
  });

  it('rejects a token with the wrong issuer', async () => {
    const token = jwt.sign({ sub: admin.id }, env.JWT_SECRET, { issuer: 'wrong-issuer', audience: env.JWT_AUDIENCE });
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a user suspended after token issuance', async () => {
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ email: admin.email, password: 'admin-password' });
    const repository = await import('../src/modules/auth/auth.repository.js');
    vi.mocked(repository.findUserById).mockResolvedValueOnce({ ...admin, status: 'SUSPENDED' } as never);

    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

    expect(response.status).toBe(401);
  });
});

describe('password change', () => {
  async function signIn(email: string) {
    const response = await request(app).post('/api/v1/auth/login').send({ email, password: 'admin-password' });
    return response.body.data.accessToken as string;
  }

  it('stores a new hash when the current password is correct', async () => {
    const repository = await import('../src/modules/auth/auth.repository.js');
    vi.mocked(repository.updateUserPassword).mockClear();
    const token = await signIn(admin.email);

    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin-password', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(204);
    const call = vi.mocked(repository.updateUserPassword).mock.calls.at(-1);
    expect(call?.[0]).toBe(admin.id);
    expect(call?.[1]).not.toContain('a-much-longer-password');
    expect(await bcrypt.compare('a-much-longer-password', call![1])).toBe(true);
  });

  it('rejects an incorrect current password without touching the stored hash', async () => {
    const repository = await import('../src/modules/auth/auth.repository.js');
    vi.mocked(repository.updateUserPassword).mockClear();
    const token = await signIn(admin.email);

    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-the-current-password', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Current password is incorrect');
    expect(repository.updateUserPassword).not.toHaveBeenCalled();
  });

  it('rejects a new password below the twelve character policy', async () => {
    const token = await signIn(admin.email);

    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin-password', newPassword: 'seller123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects reusing the current password', async () => {
    const token = await signIn(admin.email);

    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'a-much-longer-password', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toBe('The new password must be different from the current password');
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .send({ currentPassword: 'admin-password', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(401);
  });

  it('documents the endpoint', async () => {
    const specification = await request(app).get('/api/openapi.json');

    expect(specification.body.paths['/api/v1/auth/me/password'].patch.security).toEqual([{ bearerAuth: [] }]);
  });
});
