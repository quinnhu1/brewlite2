import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const TEST_PASSWORD = 'Secret123';
const CHANGED_PASSWORD = 'NewPassword456';
const uniqueEmail = () => `auth-${randomUUID().slice(0, 12)}@test.local`;
const uniquePhone = () =>
  `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

describe('auth with PostgreSQL (fixed API contract)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const createdUsers: string[] = [];
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
      throw new Error(
        'TEST_DATABASE_URL must point to a disposable *_test database.',
      );
    }
    process.env.DATABASE_URL = testUrl;
    process.env.DIRECT_URL = testUrl;
    process.env.JWT_SECRET = 'integration-test-only-long-secret';
    process.env.AUTH_RATE_LIMIT_MAX = '1000';
    process.env.ORDER_EXPIRY_WORKER = 'false';
    process.env.PAYMENT_RECONCILE_WORKER = 'false';

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
      await db.users.deleteMany({ where: { user_id: { in: createdUsers } } });
    }
    await app?.close();
  });

  function register(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Khách kiểm thử auth',
        email: uniqueEmail(),
        phone: uniquePhone(),
        password: TEST_PASSWORD,
        ...overrides,
      });
  }

  it('registers a customer and returns only the public profile; login is a separate step', async () => {
    const response = await register().expect(201);
    createdUsers.push(response.body.user_id);
    expect(response.body).toMatchObject({
      name: 'Khách kiểm thử auth',
      role: 'customer',
      point: 0,
    });
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('password');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: response.body.email, password: TEST_PASSWORD })
      .expect(200);
    expect(typeof login.body.accessToken).toBe('string');
    expect(login.body.user.user_id).toBe(response.body.user_id);
  });

  it('rejects weak registration passwords and passwords exceeding 72 UTF-8 bytes', async () => {
    await register({ password: 'onlyletters' }).expect(400);
    await register({ password: 'abc1234' }).expect(400);
    // 26 JavaScript characters, but 74 UTF-8 bytes due to Vietnamese accents.
    await register({ password: `a1${'ế'.repeat(24)}` }).expect(400);
  });

  it('accepts a password exactly 72 UTF-8 bytes long', async () => {
    const password72 = `a1${'ế'.repeat(23)}x`;
    expect(Buffer.byteLength(password72, 'utf8')).toBe(72);
    const response = await register({ password: password72 }).expect(201);
    createdUsers.push(response.body.user_id);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: response.body.email, password: password72 })
      .expect(200);
  });

  it('changes a password through PATCH /auth/profile and revokes the old auth_version token', async () => {
    const registration = await register().expect(201);
    createdUsers.push(registration.body.user_id);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: registration.body.email, password: TEST_PASSWORD })
      .expect(200);
    const oldToken = login.body.accessToken;

    await request(app.getHttpServer())
      .patch('/auth/profile')
      .set(auth(oldToken))
      .send({ password: CHANGED_PASSWORD })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/auth/profile')
      .set(auth(oldToken))
      .send({ current_password: TEST_PASSWORD, password: 'onlyletters' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/auth/profile')
      .set(auth(oldToken))
      .send({ current_password: 'wrong-current', password: CHANGED_PASSWORD })
      .expect(401);

    const changed = await request(app.getHttpServer())
      .patch('/auth/profile')
      .set(auth(oldToken))
      .send({ current_password: TEST_PASSWORD, password: CHANGED_PASSWORD })
      .expect(200);
    expect(changed.body).not.toHaveProperty('accessToken');
    expect(changed.body).not.toHaveProperty('password');
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(oldToken))
      .expect(401);

    const newLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: registration.body.email, password: CHANGED_PASSWORD })
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(newLogin.body.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: registration.body.email, password: TEST_PASSWORD })
      .expect(401);
  });
});
