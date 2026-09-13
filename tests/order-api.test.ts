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
const product = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Demo Product',
  sku: 'UG-DEMO-001',
  price: 100,
  currency: 'INR',
  isAvailable: true,
};

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn().mockResolvedValue(reseller),
  findUserById: vi.fn().mockResolvedValue(reseller),
}));
vi.mock('../src/modules/quotes/quote.repository.js', () => ({ findProductsByIds: vi.fn().mockResolvedValue([product]) }));
vi.mock('../src/modules/orders/order.repository.js', () => ({
  createOrder: vi.fn().mockImplementation((input: { items: unknown[]; total: number }) => Promise.resolve({
    id: '44444444-4444-4444-8444-444444444444',
    orderNumber: 'UG-TEST-001',
    resellerId: reseller.id,
    status: 'PENDING',
    currency: 'INR',
    marginPercent: 10,
    total: input.total,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: input.items.map((item: any) => ({ ...item, id: 'item-id' })),
  })),
  findOrders: vi.fn().mockResolvedValue([[], 0]),
  findOrderById: vi.fn().mockResolvedValue(null),
  updateOrderStatus: vi.fn(),
}));

const { app } = await import('../src/app.js');

describe('orders API', () => {
  it('creates a bulk order with customer pricing snapshots only', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: reseller.email, password: 'reseller-password' });
    const response = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${login.body.data.accessToken}`).send({
      items: [{ productId: product.id, quantity: 5 }],
    });

    expect(response.status).toBe(201);
    expect(response.body.data.total).toBe(550);
    expect(response.body.data.items[0].customerUnitPrice).toBe(110);
    expect(response.body.data.items[0].costPrice).toBeUndefined();
  });

  it('lists only the authenticated reseller orders', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: reseller.email, password: 'reseller-password' });
    const response = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(0);
  });
});
