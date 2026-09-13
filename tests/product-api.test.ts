import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const reseller = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'reseller@example.com',
  passwordHash: 'not-used-in-this-test',
  name: 'Reseller User',
  role: 'RESELLER',
  status: 'ACTIVE',
  marginPercent: 0,
};

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserById: vi.fn().mockResolvedValue(reseller),
  findUserByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/modules/products/product.repository.js', () => ({
  findProducts: vi.fn().mockResolvedValue([[], 0]),
  findProductById: vi.fn().mockResolvedValue(null),
}));

const { app } = await import('../src/app.js');
const authToken = jwt.sign({ sub: reseller.id }, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  issuer: 'urbangear-api',
  audience: 'urbangear-clients',
});

describe('product API', () => {
  it('exposes the OpenAPI document and Swagger UI', async () => {
    const specification = await request(app).get('/api/openapi.json');
    const swaggerUi = await request(app).get('/api/docs/');

    expect(specification.status).toBe(200);
    expect(specification.body.openapi).toBe('3.0.3');
    expect(specification.body.paths['/health']).toBeDefined();
    expect(specification.body.paths['/api/v1/auth/login']).toBeDefined();
    expect(specification.body.paths['/api/v1/auth/me/margin']).toBeDefined();
    expect(specification.body.paths['/api/v1/users']).toBeDefined();
    expect(specification.body.paths['/api/v1/quotes/preview']).toBeDefined();
    expect(specification.body.paths['/api/v1/orders']).toBeDefined();
    expect(specification.body.paths['/api/v1/products']).toBeDefined();
    expect(specification.body.paths['/api/v1/products'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(specification.body.paths['/api/v1/products/{id}'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(swaggerUi.status).toBe(200);
    expect(swaggerUi.text).toContain('swagger-ui');
  });

  it('returns an empty paginated product list', async () => {
    const response = await request(app).get('/api/v1/products?page=1&pageSize=10').set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
  });

  it('rejects an invalid price range', async () => {
    const response = await request(app).get('/api/v1/products?minPrice=1000&maxPrice=500').set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for an unknown product', async () => {
    const response = await request(app).get('/api/v1/products/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Product not found');
  });

  it('rejects unauthenticated catalog reads', async () => {
    const response = await request(app).get('/api/v1/products');

    expect(response.status).toBe(401);
  });
});
