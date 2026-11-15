import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Opt-in suite: only runs when a disposable *_test database is supplied, like
// checkout.e2e-spec.ts. It never truncates tables; it deletes only its users.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const PASSWORD = 'secret123';
const NEW_PASSWORD = 'newsecret456';

function uniqueEmail() {
  // Keep it under the 50-character DTO/column limit.
  return `auth-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@test.local`;
}

function uniquePhone() {
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  return `09${digits}`;
}

suite('auth with PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  const createdUsers: string[] = [];

  const email = uniqueEmail();
  const phone = uniquePhone();
  let token = '';
  let userId = '';

  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) {
      throw new Error(
        'TEST_DATABASE_URL must point to a disposable *_test database.',
      );
    }
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
    process.env.JWT_SECRET = 'integration-test-only-long-secret';
    process.env.JWT_EXPIRES_IN_SECONDS = '3600';
    process.env.AUTH_MAX_FAILED_ATTEMPTS = '5';
    process.env.AUTH_LOCK_MINUTES = '15';
    // The limiter itself is covered by the last test; keep the rest unblocked.
    process.env.AUTH_RATE_LIMIT_MAX = '1000';
    process.env.ORDER_EXPIRY_WORKER = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    if (db && createdUsers.length) {
      await db.users.deleteMany({
        where: { user_id: { in: createdUsers } },
      });
    }
    await app?.close();
  });

  const auth = (bearer = token) => ({ Authorization: `Bearer ${bearer}` });
  const register = (body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Khách kiểm thử',
        email,
        phone,
        password: PASSWORD,
        ...body,
      });
  const login = (password: string, identifier = email) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier, password });

  it('registers a customer and signs a token', async () => {
    const response = await register().expect(201);

    token = response.body.accessToken;
    userId = response.body.user.user_id;
    createdUsers.push(userId);

    expect(typeof token).toBe('string');
    expect(response.body.user).toMatchObject({
      email: email.toLowerCase(),
      phone,
      role: 'customer',
      point: 0,
    });
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('token_version');
  });

  it('rejects a duplicate email regardless of letter case', async () => {
    await register({ email: email.toUpperCase(), phone: uniquePhone() }).expect(
      409,
    );
  });

  it('rejects a weak password', async () => {
    await register({
      email: uniqueEmail(),
      phone: uniquePhone(),
      password: 'onlyletters',
    }).expect(400);
  });

  it('requires a token for /auth/me', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set({ Authorization: 'Bearer not-a-token' })
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth())
      .expect(200);
    expect(response.body.user_id).toBe(userId);
    expect(response.body).not.toHaveProperty('password');
  });

  it('updates the profile through PATCH /auth/me', async () => {
    const response = await request(app.getHttpServer())
      .patch('/auth/me')
      .set(auth())
      .send({ name: '  Tên đã đổi  ', phone: uniquePhone() })
      .expect(200);

    expect(response.body.name).toBe('Tên đã đổi');
    expect(response.body).not.toHaveProperty('password');

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(auth())
      .send({ phone: '123' })
      .expect(400);
  });

  it('rotates the password and revokes the old token', async () => {
    const oldToken = token;

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set(auth())
      .send({ currentPassword: 'wrong-password', newPassword: NEW_PASSWORD })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set(auth())
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      .expect(200);

    token = response.body.accessToken;
    expect(token).not.toBe(oldToken);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(oldToken))
      .expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(token))
      .expect(200);

    await login(NEW_PASSWORD).expect(200);
    await login(PASSWORD).expect(401);
  });

  it('locks the account after repeated wrong passwords', async () => {
    const lockEmail = uniqueEmail();
    const lockPhone = uniquePhone();
    const registration = await register({
      email: lockEmail,
      phone: lockPhone,
    }).expect(201);
    createdUsers.push(registration.body.user.user_id);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login('wrong-password', lockEmail).expect(401);
    }

    const locked = await login(PASSWORD, lockEmail).expect(429);
    expect(locked.body.message).toContain('khoá');
  });

  it('rejects a customer from admin routes with 403', async () => {
    await request(app.getHttpServer())
      .get('/admin/products')
      .set(auth())
      .expect(403);
  });

  it('rate-limits repeated login attempts', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    try {
      await login(PASSWORD);
      const response = await login(PASSWORD);
      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
    } finally {
      process.env.AUTH_RATE_LIMIT_MAX = '1000';
    }
  });
});
