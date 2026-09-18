import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const user = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'reseller@example.com',
  passwordHash: await bcrypt.hash('reseller-password', 4),
  name: 'Reseller User',
  role: 'RESELLER',
  status: 'ACTIVE',
  marginPercent: 0,
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const PRESENTED = 'a-valid-refresh-token-value';

vi.mock('express-rate-limit', () => ({
  default: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn(async (email: string) => (email === user.email ? user : null)),
  findUserById: vi.fn(async (id: string) => (id === user.id ? user : null)),
  updateUserMargin: vi.fn(),
  updateUserPassword: vi.fn(),
  createRefreshToken: vi.fn().mockResolvedValue({ id: 'refresh-id' }),
  findRefreshToken: vi.fn().mockResolvedValue(null),
  rotateRefreshToken: vi.fn().mockResolvedValue([]),
  revokeRefreshToken: vi.fn().mockResolvedValue({}),
  revokeUserRefreshTokens: vi.fn().mockResolvedValue({ count: 2 }),
}));

const { app } = await import('../src/app.js');
const repository = await import('../src/modules/auth/auth.repository.js');

function storedToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refresh-id',
    userId: user.id,
    tokenHash: sha256(PRESENTED),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    revokedAt: null,
    createdAt: new Date(),
    user,
    ...overrides,
  };
}

beforeEach(() => {
  for (const mock of Object.values(repository)) if (vi.isMockFunction(mock)) mock.mockClear();
  vi.mocked(repository.findRefreshToken).mockResolvedValue(null);
  vi.mocked(repository.createRefreshToken).mockResolvedValue({ id: 'refresh-id' } as never);
  vi.mocked(repository.revokeUserRefreshTokens).mockResolvedValue({ count: 2 } as never);
});

describe('login issues a refresh token', () => {
  it('returns both tokens and stores only the digest', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'reseller-password' });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));

    const stored = vi.mocked(repository.createRefreshToken).mock.calls[0]![0];
    expect(stored.userId).toBe(user.id);
    expect(stored.tokenHash).toBe(sha256(response.body.data.refreshToken));
    expect(stored.tokenHash).not.toBe(response.body.data.refreshToken);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('refresh rotation', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    vi.mocked(repository.findRefreshToken).mockResolvedValueOnce(storedToken() as never);

    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: PRESENTED });

    expect(response.status).toBe(200);
    expect(repository.findRefreshToken).toHaveBeenCalledWith(sha256(PRESENTED));
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).not.toBe(PRESENTED);
    expect(response.body.data.user.email).toBe(user.email);

    const [revokedId, next] = vi.mocked(repository.rotateRefreshToken).mock.calls[0]!;
    expect(revokedId).toBe('refresh-id');
    expect(next.tokenHash).toBe(sha256(response.body.data.refreshToken));
  });

  it('treats reuse of a revoked token as theft and revokes every token for that user', async () => {
    vi.mocked(repository.findRefreshToken).mockResolvedValueOnce(storedToken({ revokedAt: new Date() }) as never);

    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: PRESENTED });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Refresh token has already been used');
    expect(repository.revokeUserRefreshTokens).toHaveBeenCalledWith(user.id);
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects an expired refresh token', async () => {
    vi.mocked(repository.findRefreshToken).mockResolvedValueOnce(storedToken({ expiresAt: new Date(Date.now() - 60_000) }) as never);

    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: PRESENTED });

    expect(response.status).toBe(401);
    expect(repository.revokeRefreshToken).toHaveBeenCalledWith('refresh-id');
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects a refresh token belonging to a suspended account', async () => {
    vi.mocked(repository.findRefreshToken).mockResolvedValueOnce(storedToken({ user: { ...user, status: 'SUSPENDED' } }) as never);

    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: PRESENTED });

    expect(response.status).toBe(401);
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects an unknown refresh token', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'a-token-that-was-never-issued' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid refresh token');
  });

  it('rejects a malformed request body', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('logout and password changes end sessions', () => {
  it('revokes the presented refresh token on logout', async () => {
    vi.mocked(repository.findRefreshToken).mockResolvedValueOnce(storedToken() as never);

    const response = await request(app).post('/api/v1/auth/logout').send({ refreshToken: PRESENTED });

    expect(response.status).toBe(204);
    expect(repository.revokeRefreshToken).toHaveBeenCalledWith('refresh-id');
  });

  it('stays quiet when logging out with an unknown token', async () => {
    const response = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'a-token-that-was-never-issued' });

    expect(response.status).toBe(204);
    expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('revokes every refresh token when the password changes', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'reseller-password' });

    const response = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ currentPassword: 'reseller-password', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(204);
    expect(repository.revokeUserRefreshTokens).toHaveBeenCalledWith(user.id);
  });

  it('documents the refresh and logout endpoints', async () => {
    const specification = await request(app).get('/api/openapi.json');

    expect(specification.body.paths['/api/v1/auth/refresh'].post).toBeDefined();
    expect(specification.body.paths['/api/v1/auth/logout'].post).toBeDefined();
  });
});
