import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
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
  marginPercent: 12,
};

const admin = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  passwordHash: 'not-used-in-this-test',
  name: 'Admin User',
  role: 'ADMIN',
  status: 'ACTIVE',
  marginPercent: 0,
};

const product = {
  id: '33333333-3333-4333-8333-333333333333',
  sku: 'UG-BAG-01',
  name: 'City Commuter Backpack',
  slug: 'city-commuter-backpack',
  description: 'Water resistant commuter backpack.',
  category: 'Bags',
  price: 1200,
  currency: 'INR',
  imageUrl: null,
  isAvailable: true,
};

const notification = {
  id: '44444444-4444-4444-8444-444444444444',
  userId: reseller.id,
  productId: product.id,
  title: 'New product launched',
  message: `${product.name} is now available in the Urban Gear catalog.`,
  readAt: null,
  createdAt: new Date('2026-09-12T10:00:00.000Z'),
  product,
};

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserById: vi.fn(async (id: string) => (id === admin.id ? admin : reseller)),
  findUserByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/modules/notifications/notification.repository.js', () => ({
  createProductNotifications: vi.fn(async (userIds: string[], created: { id: string; name: string }) =>
    userIds.map((userId) => ({
      id: '44444444-4444-4444-8444-444444444444',
      userId,
      productId: created.id,
      title: 'New product launched',
      message: `${created.name} is now available in the Urban Gear catalog.`,
      readAt: null,
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
    })),
  ),
  findNotifications: vi.fn().mockResolvedValue([[notification], 1]),
  countUnreadNotifications: vi.fn().mockResolvedValue(1),
  markNotificationRead: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock('../src/modules/products/product.repository.js', () => ({
  findProducts: vi.fn().mockResolvedValue([[], 0]),
  findProductById: vi.fn().mockResolvedValue(product),
  createProduct: vi.fn().mockResolvedValue(product),
  updateProduct: vi.fn().mockResolvedValue(product),
  deleteProduct: vi.fn().mockResolvedValue(product),
}));

vi.mock('../src/modules/users/user.repository.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/modules/users/user.repository.js')>()),
  findActiveResellerIds: vi.fn().mockResolvedValue([reseller.id]),
}));

const { app } = await import('../src/app.js');
const notificationRepository = await import('../src/modules/notifications/notification.repository.js');
const userRepository = await import('../src/modules/users/user.repository.js');

function tokenFor(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET as string, {
    algorithm: 'HS256',
    issuer: 'urbangear-api',
    audience: 'urbangear-clients',
  });
}

const resellerToken = tokenFor(reseller.id);
const adminToken = tokenFor(admin.id);

beforeEach(() => {
  vi.mocked(notificationRepository.createProductNotifications).mockClear();
  vi.mocked(notificationRepository.countUnreadNotifications).mockClear().mockResolvedValue(1);
  vi.mocked(notificationRepository.findNotifications).mockClear();
  vi.mocked(notificationRepository.markNotificationRead).mockClear().mockResolvedValue({ count: 1 });
  vi.mocked(userRepository.findActiveResellerIds).mockClear().mockResolvedValue([reseller.id]);
});

describe('notification API', () => {
  it('documents the notification endpoints', async () => {
    const specification = await request(app).get('/api/openapi.json');

    expect(specification.status).toBe(200);
    expect(specification.body.paths['/api/v1/notifications'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(specification.body.paths['/api/v1/notifications/{id}/read'].patch.security).toEqual([{ bearerAuth: [] }]);
  });

  it('lists the authenticated user notifications with unread metadata', async () => {
    const response = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${resellerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        readAt: null,
        createdAt: notification.createdAt.toISOString(),
        product: { id: product.id, name: product.name, slug: product.slug },
      },
    ]);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1, unread: 1 });
  });

  it('never exposes product cost pricing through a notification', async () => {
    const response = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${resellerToken}`);

    expect(JSON.stringify(response.body)).not.toContain('price');
    expect(response.body.data[0].product.price).toBeUndefined();
  });

  it('scopes the query to the caller and filters unread items on request', async () => {
    await request(app).get('/api/v1/notifications?unreadOnly=true&page=2&pageSize=5').set('Authorization', `Bearer ${resellerToken}`);

    expect(notificationRepository.findNotifications).toHaveBeenCalledWith({ userId: reseller.id, readAt: null }, 5, 5);
  });

  it('marks a notification read for the owner only', async () => {
    const response = await request(app).patch(`/api/v1/notifications/${notification.id}/read`).set('Authorization', `Bearer ${resellerToken}`);

    expect(response.status).toBe(204);
    expect(notificationRepository.markNotificationRead).toHaveBeenCalledWith(notification.id, reseller.id);
  });

  it('returns not found when the notification does not belong to the caller', async () => {
    vi.mocked(notificationRepository.markNotificationRead).mockResolvedValueOnce({ count: 0 });

    const response = await request(app).patch(`/api/v1/notifications/${notification.id}/read`).set('Authorization', `Bearer ${resellerToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Notification not found');
  });

  it('rejects unauthenticated notification reads', async () => {
    const response = await request(app).get('/api/v1/notifications');

    expect(response.status).toBe(401);
  });

  it('notifies every active reseller when an administrator creates a product', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: product.sku, name: product.name, slug: product.slug, description: product.description, category: product.category, price: product.price });

    expect(response.status).toBe(201);
    expect(notificationRepository.createProductNotifications).toHaveBeenCalledWith([reseller.id], product);
  });

  it('skips the fan-out when there is no active reseller', async () => {
    vi.mocked(userRepository.findActiveResellerIds).mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: product.sku, name: product.name, slug: product.slug, description: product.description, category: product.category, price: product.price });

    expect(response.status).toBe(201);
    expect(notificationRepository.createProductNotifications).not.toHaveBeenCalled();
  });

  it('does not fan out notifications for a reseller product request', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${resellerToken}`)
      .send({ sku: product.sku, name: product.name, slug: product.slug, description: product.description, category: product.category, price: product.price });

    expect(response.status).toBe(403);
    expect(notificationRepository.createProductNotifications).not.toHaveBeenCalled();
  });
});

function eventFrameReader(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return async function nextEventFrame(): Promise<{ event: string; data: Record<string, unknown> }> {
    for (;;) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary < 0) {
        const { value, done } = await reader.read();
        if (done) throw new Error('notification stream closed unexpectedly');
        buffer += decoder.decode(value, { stream: true });
        continue;
      }
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (!frame.startsWith('event:')) continue;
      const lines = frame.split('\n');
      const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
      const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim() ?? '{}';
      return { event: eventName, data: JSON.parse(dataLine) };
    }
  };
}

async function withNotificationStream(token: string, run: (next: () => Promise<{ event: string; data: Record<string, unknown> }>, response: Response) => Promise<void>) {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const controller = new AbortController();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    await run(response.body ? eventFrameReader(response.body) : async () => { throw new Error('no stream body'); }, response);
  } finally {
    controller.abort();
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('notification stream', () => {
  it('opens an event stream with the current unread count', async () => {
    await withNotificationStream(resellerToken, async (nextEventFrame, response) => {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(response.headers.get('cache-control')).toContain('no-cache');
      expect(await nextEventFrame()).toEqual({ event: 'ready', data: { unread: 1 } });
    });
  });

  it('pushes a new product alert to a connected reseller without a refetch', async () => {
    await withNotificationStream(resellerToken, async (nextEventFrame) => {
      await nextEventFrame();

      const created = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: product.sku, name: product.name, slug: product.slug, description: product.description, category: product.category, price: product.price });
      expect(created.status).toBe(201);

      const pushed = await nextEventFrame();
      expect(pushed.event).toBe('notification');
      expect(pushed.data).toEqual({
        id: notification.id,
        title: 'New product launched',
        message: `${product.name} is now available in the Urban Gear catalog.`,
        readAt: null,
        createdAt: notification.createdAt.toISOString(),
        product: { id: product.id, name: product.name, slug: product.slug },
      });
      expect(JSON.stringify(pushed.data)).not.toContain('price');
    });
  });

  it('rejects an unauthenticated stream', async () => {
    const response = await request(app).get('/api/v1/notifications/stream');

    expect(response.status).toBe(401);
  });

  it('documents the stream endpoint', async () => {
    const specification = await request(app).get('/api/openapi.json');

    expect(specification.body.paths['/api/v1/notifications/stream'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});
