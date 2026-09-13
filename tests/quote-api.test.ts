import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const reseller = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'reseller@example.com',
  passwordHash: await bcrypt.hash('reseller-password', 4),
  name: 'Reseller User',
  role: 'RESELLER',
  status: 'ACTIVE',
  marginPercent: 10,
};

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn().mockResolvedValue(reseller),
  findUserById: vi.fn().mockResolvedValue(reseller),
}));

vi.mock('../src/modules/quotes/quote.repository.js', () => ({
  findProductsByIds: vi.fn().mockResolvedValue([{ id: '33333333-3333-4333-8333-333333333333', name: 'Demo Product', price: 100, currency: 'INR' }]),
}));

const { app } = await import('../src/app.js');

describe('quote preview API', () => {
  it('uses the reseller margin and does not expose cost price', async () => {
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ email: reseller.email, password: 'reseller-password' });
    const response = await request(app)
      .post('/api/v1/quotes/preview')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .send({ items: [{ productId: '33333333-3333-4333-8333-333333333333', quantity: 2 }] });

    expect(response.status).toBe(200);
    expect(response.body.data.marginPercent).toBe(10);
    expect(response.body.data.items[0].customerUnitPrice).toBe(110);
    expect(response.body.data.items[0].customerLineTotal).toBe(220);
    expect(response.body.data.items[0].costPrice).toBeUndefined();
    expect(response.body.data.total).toBe(220);
  });

  it('supports a temporary margin override for preview', async () => {
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ email: reseller.email, password: 'reseller-password' });
    const response = await request(app)
      .post('/api/v1/quotes/preview')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .send({ marginPercent: 25, items: [{ productId: '33333333-3333-4333-8333-333333333333', quantity: 1 }] });

    expect(response.status).toBe(200);
    expect(response.body.data.marginPercent).toBe(25);
    expect(response.body.data.total).toBe(125);
  });
});
