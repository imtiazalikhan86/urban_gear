import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/urbangear_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

const user = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'reseller@example.com',
  passwordHash: 'existing-hash',
  name: 'Reseller User',
  role: 'RESELLER',
  status: 'ACTIVE',
  marginPercent: 0,
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

vi.mock('express-rate-limit', () => ({
  default: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));

vi.mock('../src/lib/mailer.js', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn(async (email: string) => (email === user.email ? user : null)),
  findUserById: vi.fn(async (id: string) => (id === user.id ? user : null)),
  updateUserMargin: vi.fn(),
  updateUserPassword: vi.fn(),
  createPasswordResetToken: vi.fn().mockResolvedValue({ id: 'token-id' }),
  findPasswordResetToken: vi.fn().mockResolvedValue(null),
  consumePasswordResetToken: vi.fn().mockResolvedValue([]),
  revokeUserRefreshTokens: vi.fn().mockResolvedValue({ count: 0 }),
}));

const { app } = await import('../src/app.js');
const repository = await import('../src/modules/auth/auth.repository.js');
const mailer = await import('../src/lib/mailer.js');

function tokenRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-id',
    userId: user.id,
    tokenHash: sha256('a-valid-reset-token-value'),
    expiresAt: new Date(Date.now() + 10 * 60_000),
    usedAt: null,
    createdAt: new Date(),
    user,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(repository.createPasswordResetToken).mockClear();
  vi.mocked(repository.consumePasswordResetToken).mockClear();
  vi.mocked(repository.findPasswordResetToken).mockClear().mockResolvedValue(null);
  vi.mocked(mailer.sendMail).mockClear();
});

describe('forgot password', () => {
  it('emails a reset link and stores only the token digest', async () => {
    const response = await request(app).post('/api/v1/auth/password/forgot').send({ email: user.email });

    expect(response.status).toBe(202);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);

    const message = vi.mocked(mailer.sendMail).mock.calls[0]![0];
    expect(message.to).toBe(user.email);
    const emailedToken = /token=([^\s]+)/.exec(message.text)?.[1];
    expect(emailedToken).toBeTruthy();

    const stored = vi.mocked(repository.createPasswordResetToken).mock.calls[0]![0];
    expect(stored.userId).toBe(user.id);
    expect(stored.tokenHash).toBe(sha256(decodeURIComponent(emailedToken!)));
    expect(stored.tokenHash).not.toBe(emailedToken);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('answers the same way for an unknown email and issues nothing', async () => {
    const response = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'nobody@example.com' });

    expect(response.status).toBe(202);
    expect(response.body.data.message).toBe('If that email matches an account, a reset link is on its way.');
    expect(repository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('does not issue a reset link for a suspended account', async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce({ ...user, status: 'SUSPENDED' } as never);

    const response = await request(app).post('/api/v1/auth/password/forgot').send({ email: user.email });

    expect(response.status).toBe(202);
    expect(repository.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const response = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('reset password with a token', () => {
  it('looks the token up by digest and stores a new hash', async () => {
    vi.mocked(repository.findPasswordResetToken).mockResolvedValueOnce(tokenRecord() as never);

    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-valid-reset-token-value', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(204);
    expect(repository.findPasswordResetToken).toHaveBeenCalledWith(sha256('a-valid-reset-token-value'));

    const [tokenId, userId, passwordHash] = vi.mocked(repository.consumePasswordResetToken).mock.calls[0]!;
    expect(tokenId).toBe('token-id');
    expect(userId).toBe(user.id);
    expect(await bcrypt.compare('a-much-longer-password', passwordHash)).toBe(true);
  });

  it('rejects an unknown token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-token-that-does-not-exist', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('This password reset link is invalid or has expired');
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    vi.mocked(repository.findPasswordResetToken).mockResolvedValueOnce(tokenRecord({ expiresAt: new Date(Date.now() - 60_000) }) as never);

    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-valid-reset-token-value', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(400);
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects a token that was already used', async () => {
    vi.mocked(repository.findPasswordResetToken).mockResolvedValueOnce(tokenRecord({ usedAt: new Date() }) as never);

    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-valid-reset-token-value', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(400);
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects a token belonging to a suspended account', async () => {
    vi.mocked(repository.findPasswordResetToken).mockResolvedValueOnce(tokenRecord({ user: { ...user, status: 'SUSPENDED' } }) as never);

    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-valid-reset-token-value', newPassword: 'a-much-longer-password' });

    expect(response.status).toBe(400);
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('enforces the twelve character policy', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'a-valid-reset-token-value', newPassword: 'seller123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(repository.findPasswordResetToken).not.toHaveBeenCalled();
  });

  it('documents both endpoints', async () => {
    const specification = await request(app).get('/api/openapi.json');

    expect(specification.body.paths['/api/v1/auth/password/forgot'].post).toBeDefined();
    expect(specification.body.paths['/api/v1/auth/password/reset'].post).toBeDefined();
  });
});
