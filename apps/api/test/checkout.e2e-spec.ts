import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RefundsService } from '../src/refunds/refunds.service';
import { PaymentsService } from '../src/payments/payments.service';
import { OrdersService } from '../src/orders/orders.service';
import { canonical, hmac, vnpDate } from '../src/payments/vnpay';

const PRODUCT = 'c1111111-1111-4111-8111-000000000001';
const MATCHA = 'c1111111-1111-4111-8111-000000000011';
const REDBEAN = 'c2222222-2222-4222-8222-000000000007';
describe('checkout with PostgreSQL', () => {
  let app: INestApplication;
  let db: PrismaService;
  let tokenA: string, tokenB: string, userA: string;
  const newKey = () => randomUUID();
  const body = (extra: Record<string, unknown> = {}) => ({
    customer_name: 'Khách kiểm thử',
    customer_phone: '0901234567',
    pickup_method: 'AT_COUNTER',
    items: [{ product_id: PRODUCT, size: 'S', quantity: 1, topping_ids: [] }],
    ...extra,
  });
  const auth = (token = tokenA) => ({ Authorization: `Bearer ${token}` });
  const create = (data = body(), key = newKey(), token = tokenA) =>
    request(app.getHttpServer())
      .post('/orders')
      .set(auth(token))
      .set('Idempotency-Key', key)
      .send(data);
  const pay = (
    id: string,
    key = newKey(),
    outcome: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    token = tokenA,
  ) =>
    request(app.getHttpServer())
      .post('/payments')
      .set(auth(token))
      .set('Idempotency-Key', key)
      .send({ order_id: id, method: 'vnpay', simulate_result: outcome });
  beforeAll(async () => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'integration-test-secret';
    process.env.VNPAY_RETURN_URL =
      'http://localhost:3001/payments/vnpay/return';
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = app.get(PrismaService);
  });
  beforeEach(async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = 'true';
    process.env.NODE_ENV = 'test';
    process.env.VNPAY_REFUND_ENABLED = 'true';
    await db.$executeRawUnsafe(
      'TRUNCATE auth_rate_limits,loyalty_transactions,payments,order_item_toppings,order_items,orders,users CASCADE',
    );
    await db.product.updateMany({
      data: { stock: 50, version: { increment: 1 } },
    });
    for (const [phone, email, name] of [
      ['0901234567', 'a@test.local', 'User A'],
      ['0901234568', 'b@test.local', 'User B'],
    ]) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ phone, email, name, password: 'test-pass-123' })
        .expect(201);
    }
    const a = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'a@test.local', password: 'test-pass-123' })
      .expect(200);
    const b = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'b@test.local', password: 'test-pass-123' })
      .expect(200);
    tokenA = a.body.accessToken;
    userA = a.body.user.user_id;
    tokenB = b.body.accessToken;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('exposes the classroom mock configuration and supports wallet/card in a production demo', async () => {
    const config = await request(app.getHttpServer())
      .get('/payments/config')
      .expect(200);
    expect(config.body).toMatchObject({
      provider: 'mock',
      methods: ['momo', 'banking'],
      allow_simulate: true,
    });
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION = 'false';
    await request(app.getHttpServer()).get('/payments/config').expect(503);
    process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION = 'true';
    try {
      for (const method of ['momo', 'banking']) {
        const o = await create().expect(201);
        const p = await request(app.getHttpServer())
          .post('/payments')
          .set(auth())
          .set('Idempotency-Key', newKey())
          .send({ order_id: o.body.order_id, method })
          .expect(200);
        expect(p.body).toMatchObject({
          provider: 'mock',
          method,
          payment_status: 'success',
          order_status: 'PAID',
        });
      }
    } finally {
      process.env.NODE_ENV = 'test';
      delete process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION;
    }
  });
  it('disables simulated outcomes when the backend override is off', async () => {
    process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = 'false';
    const config = await request(app.getHttpServer())
      .get('/payments/config')
      .expect(200);
    expect(config.body.allow_simulate).toBe(false);
    const o = await create().expect(201);
    await pay(o.body.order_id, newKey(), 'FAILED').expect(400);
    expect(await db.payments.count()).toBe(0);
  });

  async function promoteAdmin() {
    await db.users.update({
      where: { user_id: userA },
      data: { role: 'admin' },
    });
  }
  const productBody = () => ({
    productName: 'Admin test drink',
    description: 'A test product',
    basePrice: 30000,
    imageUrl: '/images/espresso.jpg',
    categories: 'Tea',
    stock: 10,
    isActive: true,
    sizes: [
      { size: 'S', addPrice: 0 },
      { size: 'M', addPrice: 5000 },
      { size: 'L', addPrice: 10000 },
    ],
    toppingIds: [REDBEAN],
  });
  it('protects admin data from anonymous users, customers and staff', async () => {
    await request(app.getHttpServer()).get('/admin/products').expect(401);
    await request(app.getHttpServer())
      .get('/admin/products')
      .set(auth())
      .expect(403);
    await db.users.update({
      where: { user_id: userA },
      data: { role: 'staff' },
    });
    await request(app.getHttpServer())
      .post('/admin/products')
      .set(auth())
      .send(productBody())
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/orders')
      .set(auth())
      .expect(403);
  });
  it('prevents self-assignment of admin privileges at registration', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Attempt',
        phone: '0901111222',
        email: 'attempt@test.local',
        password: 'AttemptPass123',
        role: 'admin',
      })
      .expect(400);
  });
  it('adds a fully configured product and makes it available in the public menu', async () => {
    await promoteAdmin();
    const p = await request(app.getHttpServer())
      .post('/admin/products')
      .set(auth())
      .send(productBody())
      .expect(201);
    try {
      const detail = await request(app.getHttpServer())
        .get('/products/' + p.body.productId)
        .expect(200);
      expect(
        detail.body.product_size.map((s: { size: string }) => s.size),
      ).toEqual(['S', 'M', 'L']);
      expect(detail.body.toppings[0].topping_id).toBe(REDBEAN);
    } finally {
      await db.product_size.deleteMany({
        where: { product_id: p.body.productId },
      });
      await db.product_toppings.deleteMany({
        where: { product_id: p.body.productId },
      });
      await db.product.delete({ where: { productId: p.body.productId } });
    }
  });
  it('rejects missing drink sizes, invalid toppings, negative price and unknown fields', async () => {
    await promoteAdmin();
    for (const body of [
      { ...productBody(), sizes: [{ size: 'S', addPrice: 0 }] },
      { ...productBody(), toppingIds: [newKey()] },
      { ...productBody(), basePrice: -1 },
      { ...productBody(), isAdmin: true },
    ])
      await request(app.getHttpServer())
        .post('/admin/products')
        .set(auth())
        .send(body)
        .expect(400);
  });
  it('uses product version to prevent an admin edit overwriting changed stock', async () => {
    await promoteAdmin();
    const p = await db.product.findUniqueOrThrow({
      where: { productId: PRODUCT },
    });
    await db.product.update({
      where: { productId: PRODUCT },
      data: { stock: { decrement: 1 }, version: { increment: 1 } },
    });
    await request(app.getHttpServer())
      .put('/admin/products/' + PRODUCT)
      .set(auth())
      .send({ ...productBody(), version: p.version })
      .expect(409);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(49);
  });
  it('filters admin products, pages results and rejects an invalid page', async () => {
    await promoteAdmin();
    const p = await request(app.getHttpServer())
      .get('/admin/products?q=Matcha&category=Tea&active=true')
      .set(auth())
      .expect(200);
    expect(p.body.items.length).toBeGreaterThan(0);
    expect(
      p.body.items.every((p: { categories: string }) => p.categories === 'Tea'),
    ).toBe(true);
    await request(app.getHttpServer())
      .get('/admin/products?page=-1')
      .set(auth())
      .expect(400);
  });
  it('shows all customers orders only to admin, with guarded progress changes', async () => {
    const o = await create().expect(201);
    await pay(o.body.order_id).expect(200);
    await db.users.updateMany({
      where: { user_id: { not: userA } },
      data: { role: 'admin' },
    });
    const list = await request(app.getHttpServer())
      .get('/admin/orders?view=tracking')
      .set(auth(tokenB))
      .expect(200);
    expect(list.body.items[0].order_id).toBe(o.body.order_id);
    await request(app.getHttpServer())
      .get('/orders/' + o.body.order_id)
      .set(auth(tokenB))
      .expect(404);
    await request(app.getHttpServer())
      .get('/admin/orders/' + o.body.order_id)
      .set(auth(tokenB))
      .expect(200);
    await request(app.getHttpServer())
      .patch('/admin/orders/' + o.body.order_id + '/status')
      .set(auth(tokenB))
      .send({ status: 'completed' })
      .expect(409);
    for (const status of ['preparing', 'ready', 'completed'])
      await request(app.getHttpServer())
        .patch('/admin/orders/' + o.body.order_id + '/status')
        .set(auth(tokenB))
        .send({ status })
        .expect(200);
    const history = await request(app.getHttpServer())
      .get('/admin/orders?status=completed')
      .set(auth(tokenB))
      .expect(200);
    expect(history.body.items[0].status).toBe('COMPLETED');
  });
  it('reports an unconfigured VNPay merchant and refuses browser-simulated settlement', async () => {
    process.env.PAYMENT_PROVIDER = 'vnpay';
    const secret = process.env.VNPAY_HASH_SECRET;
    delete process.env.VNPAY_HASH_SECRET;
    try {
      const config = await request(app.getHttpServer())
        .get('/payments/config')
        .expect(200);
      expect(config.body.configured).toBe(false);
      expect(config.body.allow_simulate).toBe(false);
      expect(JSON.stringify(config.body)).not.toContain(
        'integration-test-secret',
      );
      const o = await create().expect(201);
      await request(app.getHttpServer())
        .post('/payments')
        .set(auth())
        .set('Idempotency-Key', newKey())
        .send({ order_id: o.body.order_id, method: 'vnpay' })
        .expect(503);
      expect(await db.payments.count()).toBe(0);
    } finally {
      process.env.VNPAY_HASH_SECRET = secret;
    }
  });
  it('creates the requested QR, domestic-card and international-card VNPay channels', async () => {
    process.env.PAYMENT_PROVIDER = 'vnpay';
    process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = 'false';
    for (const bank_code of ['VNPAYQR', 'VNBANK', 'INTCARD']) {
      const o = await create().expect(201);
      const p = await request(app.getHttpServer())
        .post('/payments')
        .set(auth())
        .set('Idempotency-Key', newKey())
        .send({ order_id: o.body.order_id, method: 'vnpay', bank_code })
        .expect(200);
      expect(new URL(p.body.payment_url).searchParams.get('vnp_BankCode')).toBe(
        bank_code,
      );
      expect(p.body.payment_status).toBe('pending');
    }
  });

  it('requires JWT on ordering, history and payment', async () => {
    await request(app.getHttpServer()).post('/orders').send(body()).expect(401);
    await request(app.getHttpServer()).get('/orders/me').expect(401);
    await request(app.getHttpServer())
      .post('/payments')
      .send({ order_id: newKey(), method: 'vnpay' })
      .expect(401);
  });
  it('rejects client-supplied prices and empty carts', async () => {
    await create(body({ total: 1 })).expect(400);
    await create(body({ items: [] })).expect(400);
    expect(await db.orders.count()).toBe(0);
  });
  it('prices database-specific sizes, toppings and promotions without creating orders', async () => {
    const q = await request(app.getHttpServer())
      .post('/orders/quote')
      .set(auth())
      .send(
        body({
          promotion_code: 'BREW10',
          items: [
            {
              product_id: MATCHA,
              size: 'M',
              quantity: 2,
              topping_ids: [REDBEAN],
            },
          ],
        }),
      )
      .expect(200);
    expect(q.body).toMatchObject({
      subtotal: 100000,
      discount: 10000,
      total: 90000,
    });
    expect(await db.orders.count()).toBe(0);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: MATCHA } }))
        .stock,
    ).toBe(50);
  });
  it('associates each order/history with its JWT user and hides other users orders', async () => {
    const o = await create().expect(201);
    expect(
      (
        await db.orders.findUniqueOrThrow({
          where: { order_id: o.body.order_id },
        })
      ).user_id,
    ).toBe(userA);
    const history = await request(app.getHttpServer())
      .get('/orders/me')
      .set(auth())
      .expect(200);
    expect(history.body.items[0].order_id).toBe(o.body.order_id);
    expect(history.body.items[0].items[0].product_name).toBe('Espresso');
    const empty = await request(app.getHttpServer())
      .get('/orders/me')
      .set(auth(tokenB))
      .expect(200);
    expect(empty.body.total).toBe(0);
    await request(app.getHttpServer())
      .get(`/orders/${o.body.order_id}`)
      .set(auth(tokenB))
      .expect(404);
    await pay(o.body.order_id, newKey(), 'SUCCESS', tokenB).expect(404);
  });
  it('deduplicates concurrent create requests with the same key', async () => {
    const key = newKey();
    const out = await Promise.all([
      create(body(), key),
      create(body(), key),
      create(body(), key),
    ]);
    expect(out.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(new Set(out.map((r) => r.body.order_id)).size).toBe(1);
    expect(await db.orders.count()).toBe(1);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(49);
  });
  it('rejects reused checkout keys for different content', async () => {
    const key = newKey();
    await create(body(), key).expect(201);
    await create(body({ customer_name: 'Different' }), key).expect(409);
  });
  it('does not oversell the last serving under concurrent different requests', async () => {
    await db.product.update({
      where: { productId: PRODUCT },
      data: { stock: 1 },
    });
    const out = await Promise.all([create(), create(), create()]);
    expect(out.filter((r) => r.status === 201)).toHaveLength(1);
    expect(out.every((r) => [201, 400, 409].includes(r.status))).toBe(true);
    expect(await db.orders.count()).toBe(1);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(0);
  });
  it('makes repeated/concurrent payments one charge and one loyalty credit', async () => {
    const o = await create().expect(201),
      key = newKey();
    const out = await Promise.all([
      pay(o.body.order_id, key),
      pay(o.body.order_id, key),
    ]);
    expect(out.map((r) => r.status)).toEqual([200, 200]);
    expect(out[0].body.payment_id).toBe(out[1].body.payment_id);
    expect(await db.payments.count()).toBe(1);
    expect(await db.loyalty_transactions.count()).toBe(1);
    expect(
      (await db.users.findUniqueOrThrow({ where: { user_id: userA } })).point,
    ).toBe(2);
  });
  it('prevents distinct payment keys from charging the same order twice', async () => {
    const o = await create().expect(201);
    const out = await Promise.all([pay(o.body.order_id), pay(o.body.order_id)]);
    expect(out.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(await db.payments.count({ where: { status: 'success' } })).toBe(1);
  });
  it('keeps failed payments retryable and grants points only after success', async () => {
    const o = await create().expect(201);
    const failed = await pay(o.body.order_id, newKey(), 'FAILED').expect(200);
    expect(failed.body.order_status).toBe('PAYMENT_FAILED');
    expect(await db.loyalty_transactions.count()).toBe(0);
    const success = await pay(o.body.order_id).expect(200);
    expect(success.body.order_status).toBe('PAID');
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(49);
  });
  it('restores a cancelled reservation once and refuses further payments', async () => {
    const o = await create().expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${o.body.order_id}/cancel`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .post(`/orders/${o.body.order_id}/cancel`)
      .set(auth())
      .expect(200);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(50);
    await pay(o.body.order_id).expect(409);
  });
  it('cancels and refunds a PAID mock order, restoring stock/points exactly once', async () => {
    const o = await create().expect(201);
    await pay(o.body.order_id).expect(200);
    const results = await Promise.all([
      request(app.getHttpServer())
        .post(`/orders/${o.body.order_id}/cancel`)
        .set(auth()),
      request(app.getHttpServer())
        .post(`/orders/${o.body.order_id}/cancel`)
        .set(auth()),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body.status).toBe('CANCELLED');
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(50);
    expect(
      (await db.users.findUniqueOrThrow({ where: { user_id: userA } })).point,
    ).toBe(0);
    expect(
      await db.loyalty_transactions.count({ where: { type: 'ADJUST' } }),
    ).toBe(1);
    expect(
      (
        await db.payments.findFirstOrThrow({
          where: { order_id: o.body.order_id },
        })
      ).status,
    ).toBe('refunded');
    await pay(o.body.order_id).expect(409);
  });
  it('refuses cancellation once a paid order is being prepared', async () => {
    const o = await create().expect(201);
    await pay(o.body.order_id).expect(200);
    await db.users.update({
      where: { user_id: userA },
      data: { role: 'staff' },
    });
    await request(app.getHttpServer())
      .patch(`/orders/${o.body.order_id}/status`)
      .set(auth())
      .send({ status: 'preparing' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/orders/${o.body.order_id}/cancel`)
      .set(auth())
      .expect(409);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(49);
  });

  it('expires abandoned unpaid orders and restores stock', async () => {
    const o = await create().expect(201);
    await db.orders.update({
      where: { order_id: o.body.order_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    await app.get(OrdersService).expireUnpaidOrders();
    expect(
      (
        await db.orders.findUniqueOrThrow({
          where: { order_id: o.body.order_id },
        })
      ).status,
    ).toBe('cancelled');
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(50);
  });
  it('enforces staff permissions and state progression', async () => {
    const o = await create().expect(201);
    await pay(o.body.order_id).expect(200);
    const patch = (status: string) =>
      request(app.getHttpServer())
        .patch(`/orders/${o.body.order_id}/status`)
        .set(auth())
        .send({ status });
    await patch('preparing').expect(403);
    await db.users.update({
      where: { user_id: userA },
      data: { role: 'staff' },
    });
    await patch('completed').expect(409);
    await patch('preparing').expect(200);
    await patch('ready').expect(200);
    await patch('completed').expect(200);
    await patch('preparing').expect(409);
  });

  it('ranks only active products by quantity from completed orders', async () => {
    const productIds = [
      PRODUCT,
      ...['002', '003', '004'].map(
        (suffix) => `c1111111-1111-4111-8111-000000000${suffix}`,
      ),
    ];
    const items = productIds.map((product_id, index) => ({
      ...body().items[0],
      product_id,
      quantity: [1, 2, 2, 3][index],
    }));
    const order = await create(body({ items })).expect(201);
    await pay(order.body.order_id).expect(200);
    const menu = () =>
      request(app.getHttpServer()).get('/products').expect(200);
    expect((await menu()).body.filter((row) => row.isBestSeller)).toEqual([]);

    await promoteAdmin();
    for (const status of ['preparing', 'ready', 'completed']) {
      await request(app.getHttpServer())
        .patch(`/admin/orders/${order.body.order_id}/status`)
        .set(auth())
        .send({ status })
        .expect(200);
    }
    const ranked = (
      rows: {
        productId: string;
        isBestSeller: boolean;
        bestSellerRank: number;
      }[],
    ) =>
      rows
        .filter((row) => row.isBestSeller)
        .sort((a, b) => a.bestSellerRank - b.bestSellerRank)
        .map((row) => row.productId);
    expect(ranked((await menu()).body)).toEqual([
      productIds[3],
      productIds[1],
      productIds[2],
    ]);
    try {
      await db.product.update({
        where: { productId: productIds[3] },
        data: { isActive: false },
      });
      expect(ranked((await menu()).body)).toEqual([
        productIds[1],
        productIds[2],
        productIds[0],
      ]);
    } finally {
      await db.product.update({
        where: { productId: productIds[3] },
        data: { isActive: true },
      });
    }
  });

  async function pending() {
    process.env.PAYMENT_PROVIDER = 'vnpay';
    process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = 'false';
    const o = await create().expect(201);
    const p = await request(app.getHttpServer())
      .post('/payments')
      .set(auth())
      .set('Idempotency-Key', newKey())
      .send({ order_id: o.body.order_id, method: 'vnpay' })
      .expect(200);
    // Move fixture to the first scheduled query time; production waits one minute.
    await db.payments.update({
      where: { payment_id: p.body.payment_id },
      data: { next_check_at: null },
    });
    return { o: o.body, p: p.body };
  }
  function signed(ref: string, extra: Record<string, string> = {}) {
    const params: Record<string, string> = {
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: ref,
      vnp_Amount: '2900000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '123456789',
      vnp_PayDate: vnpDate(new Date()),
      ...extra,
    };
    params.vnp_SecureHash = hmac(canonical(params), 'integration-test-secret');
    return params;
  }
  it('records a signed gateway failure without granting points, then allows a new attempt', async () => {
    const { o, p } = await pending();
    const q = signed(p.reference, {
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
      vnp_TransactionNo: '0',
    });
    const failed = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(q)
      .expect(200);
    expect(failed.body.RspCode).toBe('00');
    const checked = await request(app.getHttpServer())
      .get(`/payments/reference/${p.reference}`)
      .set(auth())
      .expect(200);
    expect(checked.body).toMatchObject({
      payment_status: 'failed',
      response_code: '24',
    });
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('payment_failed');
    expect(await db.loyalty_transactions.count()).toBe(0);
    const again = await request(app.getHttpServer())
      .post('/payments')
      .set(auth())
      .set('Idempotency-Key', newKey())
      .send({ order_id: o.order_id, method: 'vnpay' })
      .expect(200);
    expect(again.body.payment_status).toBe('pending');
    expect(again.body.payment_id).not.toBe(p.payment_id);
  });
  it('creates signed VNPay sessions without claiming PAID', async () => {
    const { o, p } = await pending();
    const u = new URL(p.payment_url);
    expect(p.payment_status).toBe('pending');
    expect(u.hostname).toBe('sandbox.vnpayment.vn');
    expect(u.searchParams.get('vnp_Amount')).toBe('2900000');
    expect(u.searchParams.get('vnp_Version')).toBe('2.1.0');
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('pending');
    const again = await request(app.getHttpServer())
      .post('/payments')
      .set(auth())
      .set('Idempotency-Key', newKey())
      .send({ order_id: o.order_id, method: 'vnpay' })
      .expect(200);
    expect(again.body.payment_id).toBe(p.payment_id);
    expect(await db.payments.count()).toBe(1);
    await request(app.getHttpServer())
      .post('/payments')
      .set(auth())
      .set('Idempotency-Key', newKey())
      .send({
        order_id: o.order_id,
        method: 'vnpay',
        simulate_result: 'SUCCESS',
      })
      .expect(400);
  });
  it('rejects unsigned, tampered and wrong-amount IPNs', async () => {
    const { p } = await pending();
    const invalid = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query({ ...signed(p.reference), vnp_Amount: '1' })
      .expect(200);
    expect(invalid.body.RspCode).toBe('97');
    const amount = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(signed(p.reference, { vnp_Amount: '100' }))
      .expect(200);
    expect(amount.body.RspCode).toBe('04');
    expect(await db.loyalty_transactions.count()).toBe(0);
  });
  it('confirms valid concurrent IPNs atomically and only once', async () => {
    const { o, p } = await pending();
    const q = signed(p.reference);
    const out = await Promise.all([
      request(app.getHttpServer()).get('/payments/vnpay/ipn').query(q),
      request(app.getHttpServer()).get('/payments/vnpay/ipn').query(q),
    ]);
    expect(
      out
        .map((r) => r.body.RspCode as string)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['00', '02']);
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('paid');
    expect(await db.loyalty_transactions.count()).toBe(1);
    const hidden = await request(app.getHttpServer())
      .get(`/payments/reference/${p.reference}`)
      .set(auth(tokenB))
      .expect(404);
    expect(hidden.status).toBe(404);
  });
  it('confirms a signed successful IPN when the optional pay date is omitted', async () => {
    const { p } = await pending();
    const params = signed(p.reference);
    delete params.vnp_PayDate;
    params.vnp_SecureHash = hmac(canonical(params), 'integration-test-secret');
    const confirmed = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(params)
      .expect(200);
    expect(confirmed.body.RspCode).toBe('00');
    const status = await request(app.getHttpServer())
      .get(`/payments/reference/${p.reference}`)
      .set(auth())
      .expect(200);
    expect(status.body).toMatchObject({
      payment_status: 'success',
      response_code: '00',
      paid_at: null,
    });
  });
  it('uses ReturnUrl for display only and keeps unresolved gateway stock reserved', async () => {
    const { o, p } = await pending();
    await request(app.getHttpServer())
      .get('/payments/vnpay/return')
      .query(signed(p.reference))
      .expect(303);
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('pending');
    await db.orders.update({
      where: { order_id: o.order_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    await app.get(OrdersService).expireUnpaidOrders();
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .stock_reserved,
    ).toBe(true);
    await request(app.getHttpServer())
      .post(`/orders/${o.order_id}/cancel`)
      .set(auth())
      .expect(200);
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .cancellation_requested_at,
    ).not.toBeNull();
  });
  it('keeps suspicious/reversal callbacks pending for reconciliation', async () => {
    const { p } = await pending();
    const q = signed(p.reference, {
      vnp_ResponseCode: '07',
      vnp_TransactionStatus: '07',
    });
    const result = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(q)
      .expect(200);
    expect(result.body.RspCode).toBe('99');
    expect(
      (
        await db.payments.findUniqueOrThrow({
          where: { payment_id: p.payment_id },
        })
      ).status,
    ).toBe('pending');
  });
  it('maintains case-insensitive email uniqueness during concurrent signup', async () => {
    const out = await Promise.all(
      ['0900000001', '0900000002'].map((phone) =>
        request(app.getHttpServer()).post('/auth/register').send({
          phone,
          name: 'Concurrent',
          email: 'SAME@test.local',
          password: 'test-pass-123',
        }),
      ),
    );
    expect(out.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'SAME@TEST.LOCAL', password: 'test-pass-123' })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();
  });
  it('aggregates stock across two variants of the same product', async () => {
    await db.product.update({
      where: { productId: PRODUCT },
      data: { stock: 1 },
    });
    await create(
      body({
        items: [
          { product_id: PRODUCT, size: 'S', quantity: 1, topping_ids: [] },
          { product_id: PRODUCT, size: 'M', quantity: 1, topping_ids: [] },
        ],
      }),
    ).expect(400);
    expect(await db.orders.count()).toBe(0);
  });
  it('settles a fully discounted order internally without pretending to charge VNPay', async () => {
    await db.promotions.create({
      data: {
        code: 'FREEONCE',
        promotion_name: 'Free test',
        discount_type: 'fixed',
        discount_value: 100000,
        min_amount: 0,
        start_at: new Date('2026-01-01'),
        end_at: new Date('2030-01-01'),
        is_active: true,
      },
    });
    try {
      const o = await create(body({ promotion_code: 'FREEONCE' })).expect(201);
      expect(o.body.total).toBe(0);
      const key = newKey();
      const p = await pay(o.body.order_id, key).expect(200);
      expect(p.body).toMatchObject({
        provider: 'free',
        amount: 0,
        payment_status: 'success',
      });
      expect(p.body.transaction_id.startsWith('FREE-')).toBe(true);
      await pay(o.body.order_id, key).expect(200);
      expect(await db.loyalty_transactions.count()).toBe(0);
    } finally {
      await db.promotions.delete({ where: { code: 'FREEONCE' } });
    }
  });
  it('replays payment keys only for an identical request', async () => {
    const o = await create().expect(201),
      key = newKey();
    await pay(o.body.order_id, key, 'FAILED').expect(200);
    await pay(o.body.order_id, key, 'SUCCESS').expect(409);
  });
  it('reconciles using a signed QueryDR result, validating the original transaction date', async () => {
    const { o, p } = await pending();
    const data: Record<string, string> = {
      vnp_ResponseId: 'response1',
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'Success',
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: p.reference,
      vnp_Amount: '2900000',
      vnp_BankCode: 'NCB',
      vnp_PayDate: vnpDate(new Date()),
      vnp_TransactionNo: '987654321',
      vnp_TransactionType: '01',
      vnp_TransactionStatus: '00',
      vnp_OrderInfo: 'Query result',
      vnp_PromotionCode: '',
      vnp_PromotionAmount: '',
    };
    const fields = [
      'vnp_ResponseId',
      'vnp_Command',
      'vnp_ResponseCode',
      'vnp_Message',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_BankCode',
      'vnp_PayDate',
      'vnp_TransactionNo',
      'vnp_TransactionType',
      'vnp_TransactionStatus',
      'vnp_OrderInfo',
      'vnp_PromotionCode',
      'vnp_PromotionAmount',
    ];
    data.vnp_SecureHash = hmac(
      fields.map((f) => data[f]).join('|'),
      'integration-test-secret',
    );
    const mock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(data)));
    try {
      const res = await request(app.getHttpServer())
        .post(`/payments/${p.payment_id}/reconcile`)
        .set(auth())
        .expect(200);
      expect(res.body.payment_status).toBe('success');
      const rawBody = mock.mock.calls[0][1]?.body;
      if (typeof rawBody !== 'string')
        throw new Error('QueryDR request is not JSON text');
      const sent = JSON.parse(rawBody);
      expect(sent.vnp_TransactionDate).toBe(
        new URL(p.payment_url).searchParams.get('vnp_CreateDate'),
      );
      expect(
        (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
          .status,
      ).toBe('paid');
    } finally {
      mock.mockRestore();
    }
  });
  it('does not change payment state when QueryDR is unavailable or has an invalid signature', async () => {
    const { p } = await pending();
    const mock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('timeout'));
    try {
      await request(app.getHttpServer())
        .post(`/payments/${p.payment_id}/reconcile`)
        .set(auth())
        .expect(200);
      expect(
        (
          await db.payments.findUniqueOrThrow({
            where: { payment_id: p.payment_id },
          })
        ).review_required,
      ).toBe(true);
      await db.payments.update({
        where: { payment_id: p.payment_id },
        data: { next_check_at: null },
      });
      mock.mockResolvedValue(
        new Response(
          JSON.stringify({
            vnp_ResponseCode: '00',
            vnp_TxnRef: p.reference,
            vnp_SecureHash: 'invalid',
          }),
        ),
      );
      await request(app.getHttpServer())
        .post(`/payments/${p.payment_id}/reconcile`)
        .set(auth())
        .expect(200);
      expect(mock).toHaveBeenCalledTimes(2);
      expect(
        (
          await db.payments.findUniqueOrThrow({
            where: { payment_id: p.payment_id },
          })
        ).status,
      ).toBe('pending');
    } finally {
      mock.mockRestore();
    }
  });
  it('rejects a forged nested cost and prices three drinks from the database', async () => {
    await db.product.update({
      where: { productId: PRODUCT },
      data: { basePrice: 10000 },
    });
    try {
      await create(
        body({ items: [{ ...body().items[0], quantity: 3, cost: 15000 }] }),
      ).expect(400);
      expect(await db.orders.count()).toBe(0);
      const result = await create(
        body({ items: [{ ...body().items[0], quantity: 3 }] }),
      ).expect(201);
      expect(result.body.total).toBe(30000);
    } finally {
      await db.product.update({
        where: { productId: PRODUCT },
        data: { basePrice: 29000 },
      });
    }
  });
  it('allows exactly one of two customers to reserve the last two cups', async () => {
    await db.product.update({
      where: { productId: PRODUCT },
      data: { stock: 2 },
    });
    const b = body({ items: [{ ...body().items[0], quantity: 2 }] });
    const results = await Promise.all([
      create(b, newKey(), tokenA),
      create(b, newKey(), tokenB),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.every((r) => [201, 400, 409].includes(r.status))).toBe(true);
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(0);
  });
  it('keeps the failed attempt and changes QR to ATM with a fresh payment key', async () => {
    process.env.PAYMENT_PROVIDER = 'vnpay';
    process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = 'false';
    const o = await create().expect(201);
    const start = (channel: string) =>
      request(app.getHttpServer())
        .post('/payments')
        .set(auth())
        .set('Idempotency-Key', newKey())
        .send({
          order_id: o.body.order_id,
          method: 'vnpay',
          bank_code: channel,
        });
    const qr = await start('VNPAYQR').expect(200);
    expect(new URL(qr.body.payment_url).searchParams.get('vnp_BankCode')).toBe(
      'VNPAYQR',
    );
    await start('VNBANK').expect(409);
    await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(
        signed(qr.body.reference, {
          vnp_ResponseCode: '24',
          vnp_TransactionStatus: '02',
          vnp_TransactionNo: '0',
        }),
      )
      .expect(200);
    const atm = await start('VNBANK').expect(200);
    expect(new URL(atm.body.payment_url).searchParams.get('vnp_BankCode')).toBe(
      'VNBANK',
    );
    const detail = await request(app.getHttpServer())
      .get('/orders/' + o.body.order_id)
      .set(auth())
      .expect(200);
    expect(detail.body.payment_attempts).toHaveLength(2);
    expect(
      detail.body.payment_attempts
        .map((p: { status: string }) => p.status)
        .sort(),
    ).toEqual(['failed', 'pending']);
  });
  it('finishes a requested cancellation after a verified failed IPN, releasing stock once', async () => {
    const { o, p } = await pending();
    const c = await request(app.getHttpServer())
      .post(`/orders/${o.order_id}/cancel`)
      .set(auth())
      .send({ reason: 'Đổi món' })
      .expect(200);
    expect(c.body.actions.can_retry_payment).toBe(false);
    expect(c.body.status).toBe('PENDING');
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(49);
    const q = signed(p.reference, {
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
      vnp_TransactionNo: '0',
    });
    await Promise.all([
      request(app.getHttpServer()).get('/payments/vnpay/ipn').query(q),
      request(app.getHttpServer()).get('/payments/vnpay/ipn').query(q),
    ]);
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('cancelled');
    expect(
      (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
        .stock,
    ).toBe(50);
    expect(await db.refunds.count()).toBe(0);
  });
  async function refundFixture() {
    const { o, p } = await pending();
    await request(app.getHttpServer())
      .post(`/orders/${o.order_id}/cancel`)
      .set(auth())
      .send({ reason: 'Muốn đổi món' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query(signed(p.reference))
      .expect(200);
    const r = await db.refunds.findUniqueOrThrow({
      where: { payment_id: p.payment_id },
    });
    return { o, p, r };
  }
  function apiReply(
    command: 'refund' | 'querydr',
    ref: string,
    extra: Record<string, string> = {},
  ) {
    const data: Record<string, string> = {
      vnp_ResponseId: 'response2',
      vnp_Command: command,
      vnp_ResponseCode: '00',
      vnp_Message: 'Success',
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: ref,
      vnp_Amount: '2900000',
      vnp_BankCode: 'NCB',
      vnp_PayDate: vnpDate(new Date()),
      vnp_TransactionNo: '888777666',
      vnp_TransactionType: '02',
      vnp_TransactionStatus: '00',
      vnp_OrderInfo: 'Refund',
      ...extra,
    };
    const fields = [
      'vnp_ResponseId',
      'vnp_Command',
      'vnp_ResponseCode',
      'vnp_Message',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_BankCode',
      'vnp_PayDate',
      'vnp_TransactionNo',
      'vnp_TransactionType',
      'vnp_TransactionStatus',
      'vnp_OrderInfo',
      ...(command === 'querydr'
        ? ['vnp_PromotionCode', 'vnp_PromotionAmount']
        : []),
    ];
    data.vnp_SecureHash = hmac(
      fields.map((f) => data[f] ?? '').join('|'),
      'integration-test-secret',
    );
    return new Response(JSON.stringify(data));
  }
  it('queues a refund when a successful IPN arrives after cancellation; blocks preparation and early replacement', async () => {
    const { o, r } = await refundFixture();
    expect(r.status).toBe('requested');
    expect(r.amount.toNumber()).toBe(29000);
    await promoteAdmin();
    await request(app.getHttpServer())
      .patch(`/admin/orders/${o.order_id}/status`)
      .set(auth())
      .send({ status: 'preparing' })
      .expect(409);
    await create(body({ replacement_of_order_id: o.order_id })).expect(409);
    expect(
      (await db.orders.findUniqueOrThrow({ where: { order_id: o.order_id } }))
        .status,
    ).toBe('paid');
  });
  it('refunds a verified full amount exactly once under concurrent workers, then permits replacement', async () => {
    const { o, p, r } = await refundFixture();
    const mock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => apiReply('refund', p.reference));
    try {
      const service = app.get(RefundsService);
      await Promise.all([
        service.process(r.refund_id),
        service.process(r.refund_id),
      ]);
      await service.process(r.refund_id);
      expect(mock).toHaveBeenCalledTimes(1);
      const raw = mock.mock.calls[0][1]?.body;
      if (typeof raw !== 'string') throw new Error('Expected request body');
      const sent = JSON.parse(raw);
      expect(sent.vnp_RequestId).toBe(r.request_id);
      expect(sent.vnp_Amount).toBe('2900000');
      expect(sent.vnp_TransactionDate).toBe(
        new URL(p.payment_url).searchParams.get('vnp_CreateDate'),
      );
      const fields = [
        'vnp_RequestId',
        'vnp_Version',
        'vnp_Command',
        'vnp_TmnCode',
        'vnp_TransactionType',
        'vnp_TxnRef',
        'vnp_Amount',
        'vnp_TransactionNo',
        'vnp_TransactionDate',
        'vnp_CreateBy',
        'vnp_CreateDate',
        'vnp_IpAddr',
        'vnp_OrderInfo',
      ];
      expect(sent.vnp_SecureHash).toBe(
        hmac(fields.map((f) => sent[f]).join('|'), 'integration-test-secret'),
      );
      expect(
        (
          await db.refunds.findUniqueOrThrow({
            where: { refund_id: r.refund_id },
          })
        ).status,
      ).toBe('succeeded');
      expect(
        (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
          .stock,
      ).toBe(50);
      expect(
        (await db.users.findUniqueOrThrow({ where: { user_id: userA } })).point,
      ).toBe(0);
      expect(
        await db.loyalty_transactions.count({ where: { type: 'ADJUST' } }),
      ).toBe(1);
      const replacement = await create(
        body({ replacement_of_order_id: o.order_id }),
      ).expect(201);
      expect(
        (
          await db.orders.findUniqueOrThrow({
            where: { order_id: replacement.body.order_id },
          })
        ).replacement_of_order_id,
      ).toBe(o.order_id);
      await create(
        body({ replacement_of_order_id: o.order_id }),
        newKey(),
        tokenB,
      ).expect(404);
    } finally {
      mock.mockRestore();
    }
  });
  it.each(['05', '06'])(
    'does not call a refund complete at provider status %s or mistake the original charge for a refund',
    async (status) => {
      const { p, r } = await refundFixture();
      const mock = jest
        .spyOn(global, 'fetch')
        .mockImplementation(async () =>
          apiReply('refund', p.reference, { vnp_TransactionStatus: status }),
        );
      try {
        const service = app.get(RefundsService);
        await service.process(r.refund_id);
        expect(
          (
            await db.refunds.findUniqueOrThrow({
              where: { refund_id: r.refund_id },
            })
          ).status,
        ).toBe('processing');
        await db.refunds.update({
          where: { refund_id: r.refund_id },
          data: { next_check_at: null },
        });
        mock.mockImplementation(async () =>
          apiReply('querydr', p.reference, { vnp_TransactionType: '01' }),
        );
        await service.process(r.refund_id);
        expect(
          (
            await db.payments.findUniqueOrThrow({
              where: { payment_id: p.payment_id },
            })
          ).status,
        ).toBe('success');
        expect(
          (
            await db.product.findUniqueOrThrow({
              where: { productId: PRODUCT },
            })
          ).stock,
        ).toBe(49);
        await db.refunds.update({
          where: { refund_id: r.refund_id },
          data: { next_check_at: null },
        });
        mock.mockImplementation(async () => apiReply('querydr', p.reference));
        await service.process(r.refund_id);
        expect(
          (
            await db.refunds.findUniqueOrThrow({
              where: { refund_id: r.refund_id },
            })
          ).status,
        ).toBe('succeeded');
      } finally {
        mock.mockRestore();
      }
    },
  );
  it('queries after a refund timeout instead of submitting another refund', async () => {
    const { p, r } = await refundFixture();
    const mock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Timeout'));
    try {
      await app.get(RefundsService).process(r.refund_id);
      await db.refunds.update({
        where: { refund_id: r.refund_id },
        data: { next_check_at: null },
      });
      mock.mockImplementation(async () => apiReply('querydr', p.reference));
      await app.get(RefundsService).process(r.refund_id);
      const commands = mock.mock.calls.map((c) => {
        const body = c[1]?.body;
        if (typeof body !== 'string') throw new Error('Missing body');
        return JSON.parse(body).vnp_Command;
      });
      expect(commands).toEqual(['refund', 'querydr']);
      expect(
        (
          await db.refunds.findUniqueOrThrow({
            where: { refund_id: r.refund_id },
          })
        ).status,
      ).toBe('succeeded');
    } finally {
      mock.mockRestore();
    }
  });
  it('does not refund an amount mismatch or an invalid response signature', async () => {
    const { p, r } = await refundFixture();
    const mock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () =>
        apiReply('refund', p.reference, { vnp_Amount: '100' }),
      );
    try {
      await app.get(RefundsService).process(r.refund_id);
      expect(
        (
          await db.refunds.findUniqueOrThrow({
            where: { refund_id: r.refund_id },
          })
        ).status,
      ).not.toBe('succeeded');
      await db.refunds.update({
        where: { refund_id: r.refund_id },
        data: { next_check_at: null },
      });
      mock.mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ vnp_ResponseCode: '00', vnp_SecureHash: 'fake' }),
          ),
      );
      await app.get(RefundsService).process(r.refund_id);
      expect(
        (
          await db.refunds.findUniqueOrThrow({
            where: { refund_id: r.refund_id },
          })
        ).status,
      ).toBe('review_required');
      expect(
        (
          await db.payments.findUniqueOrThrow({
            where: { payment_id: p.payment_id },
          })
        ).status,
      ).toBe('success');
      expect(
        (await db.product.findUniqueOrThrow({ where: { productId: PRODUCT } }))
          .stock,
      ).toBe(49);
    } finally {
      mock.mockRestore();
    }
  });
  it('lets the recovery worker reconcile once and throttles concurrent queries for five minutes', async () => {
    const { p } = await pending();
    const mock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Timeout'));
    try {
      await Promise.all([
        app.get(PaymentsService).runRecovery(),
        request(app.getHttpServer())
          .post(`/payments/${p.payment_id}/reconcile`)
          .set(auth()),
      ]);
      await app.get(PaymentsService).runRecovery();
      expect(mock).toHaveBeenCalledTimes(1);
      const payment = await db.payments.findUniqueOrThrow({
        where: { payment_id: p.payment_id },
      });
      expect(payment.status).toBe('pending');
      expect(payment.review_required).toBe(true);
      expect(payment.next_check_at!.getTime()).toBeGreaterThan(
        Date.now() + 290000,
      );
    } finally {
      mock.mockRestore();
    }
  });

  it('allows only an admin to reconcile an order using the provider evidence', async () => {
    const { o, p } = await pending();
    const path = `/admin/orders/${o.order_id}/reconcile`;
    await request(app.getHttpServer()).post(path).expect(401);
    await request(app.getHttpServer()).post(path).set(auth()).expect(403);
    await db.users.updateMany({
      where: { user_id: { not: userA } },
      data: { role: 'admin' },
    });
    const mock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () =>
        apiReply('querydr', p.reference, { vnp_TransactionType: '01' }),
      );
    try {
      const result = await request(app.getHttpServer())
        .post(path)
        .set(auth(tokenB))
        .expect(200);
      expect(result.body.status).toBe('PAID');
      expect(mock).toHaveBeenCalledTimes(1);
    } finally {
      mock.mockRestore();
    }
  });

  it('does not mark an unsent refund as submitted and recovers after credentials are repaired', async () => {
    const { p, r } = await refundFixture();
    const mock = jest.spyOn(global, 'fetch').mockImplementation(async () => apiReply('refund', p.reference));
    const secret = process.env.VNPAY_HASH_SECRET;
    try {
      process.env.VNPAY_HASH_SECRET = '';
      await app.get(RefundsService).process(r.refund_id);
      expect(mock).not.toHaveBeenCalled();
      const unsent = await db.refunds.findUniqueOrThrow({ where: { refund_id: r.refund_id } });
      expect(unsent.submitted_at).toBeNull();
      expect(unsent.status).toBe('review_required');
      expect(unsent.message).toContain('Chưa gửi');
      process.env.VNPAY_HASH_SECRET = secret;
      await db.refunds.update({ where: { refund_id: r.refund_id }, data: { next_check_at: null } });
      await Promise.all([app.get(RefundsService).process(r.refund_id), app.get(RefundsService).process(r.refund_id)]);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mock.mock.calls[0][1]!.body as string).vnp_Command).toBe('refund');
      expect((await db.refunds.findUniqueOrThrow({ where: { refund_id: r.refund_id } })).status).toBe('succeeded');
    } finally { process.env.VNPAY_HASH_SECRET = secret; mock.mockRestore(); }
  });

  it('keeps malformed original dates unsent until the stored payment data is repaired', async () => {
    const { p, r } = await refundFixture();
    const mock = jest.spyOn(global, 'fetch').mockImplementation(async () => apiReply('refund', p.reference));
    try {
      await db.payments.update({ where: { payment_id: p.payment_id }, data: { gateway_create_date: '20261399999999' } });
      await app.get(RefundsService).process(r.refund_id);
      expect(mock).not.toHaveBeenCalled();
      expect((await db.refunds.findUniqueOrThrow({ where: { refund_id: r.refund_id } })).submitted_at).toBeNull();
      await db.payments.update({ where: { payment_id: p.payment_id }, data: { gateway_create_date: new URL(p.payment_url).searchParams.get('vnp_CreateDate') } });
      await db.refunds.update({ where: { refund_id: r.refund_id }, data: { next_check_at: null } });
      await app.get(RefundsService).process(r.refund_id);
      expect(mock).toHaveBeenCalledTimes(1);
      expect((await db.refunds.findUniqueOrThrow({ where: { refund_id: r.refund_id } })).status).toBe('succeeded');
    } finally { mock.mockRestore(); }
  });

  it('queries rather than resends after a process restarts with a persisted dispatch claim', async () => {
    const { p, r } = await refundFixture();
    await db.refunds.update({ where: { refund_id: r.refund_id }, data: { submitted_at: new Date(), status: 'processing', next_check_at: null } });
    const mock = jest.spyOn(global, 'fetch').mockImplementation(async () => apiReply('querydr', p.reference));
    try {
      await app.get(RefundsService).process(r.refund_id);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mock.mock.calls[0][1]!.body as string).vnp_Command).toBe('querydr');
      expect((await db.refunds.findUniqueOrThrow({ where: { refund_id: r.refund_id } })).status).toBe('succeeded');
    } finally { mock.mockRestore(); }
  });

  it('requires the current password but keeps ordinary profile edits available', async () => {
    await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({name:'Updated name'}).expect(200);
    await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password:'new-password-456'}).expect(400);
    await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password:'new-password-456',current_password:'wrong'}).expect(401);
    expect((await db.users.findUniqueOrThrow({where:{user_id:userA}})).auth_version).toBe(0);
    await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(200);
  });

  it('revokes all previous tokens after a verified password change without revoking other accounts', async () => {
    const second = await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(200);
    await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password:'new-password-456',current_password:'test-pass-123'}).expect(200);
    for (const token of [tokenA, second.body.accessToken]) {
      await request(app.getHttpServer()).get('/auth/me').set(auth(token)).expect(401);
      await create(body(),newKey(),token).expect(401);
    }
    await request(app.getHttpServer()).get('/auth/me').set(auth(tokenB)).expect(200);
    await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(401);
    const login = await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'new-password-456'}).expect(200);
    await request(app.getHttpServer()).get('/auth/me').set(auth(login.body.accessToken)).expect(200);
  });

  it('allows only one concurrent password change from the same session version', async () => {
    const results = await Promise.all(['new-password-111','new-password-222'].map(password=>
      request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password,current_password:'test-pass-123'})));
    expect(results.map(r=>r.status).sort((a,b)=>a-b)).toEqual([200,401]);
    expect((await db.users.findUniqueOrThrow({where:{user_id:userA}})).auth_version).toBe(1);
  });

  it('invalidates tokens from every session when logging out', async () => {
    const second = await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(200);
    await request(app.getHttpServer()).post('/auth/logout').set(auth()).expect(200);
    for(const token of [tokenA,second.body.accessToken]) await request(app.getHttpServer()).get('/auth/me').set(auth(token)).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set(auth(tokenB)).expect(200);
  });

  it('limits repeated login attempts and allows login again after the window expires', async () => {
    for(let i=0;i<9;i++) await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'wrong'}).expect(401);
    const blocked = await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    await db.auth_rate_limits.updateMany({data:{expires_at:new Date(0)}});
    await request(app.getHttpServer()).post('/auth/login').send({identifier:'a@test.local',password:'test-pass-123'}).expect(200);
  });

  it('enforces the same login bucket under concurrent requests', async () => {
    const responses = await Promise.all(Array.from({length:14},()=>request(app.getHttpServer()).post('/auth/login').send({identifier:'absent@test.local',password:'wrong'})));
    expect(responses.filter(r=>r.status===401)).toHaveLength(10);
    expect(responses.filter(r=>r.status===429)).toHaveLength(4);
  });

  it('limits password guesses and registration attempts without blocking read-only account access', async () => {
    for(let i=0;i<5;i++) await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password:'new-password-123',current_password:'wrong'}).expect(401);
    await request(app.getHttpServer()).patch('/auth/profile').set(auth()).send({password:'new-password-123',current_password:'test-pass-123'}).expect(429);
    await request(app.getHttpServer()).get('/auth/me').set(auth()).expect(200);
    for(let i=0;i<18;i++) await request(app.getHttpServer()).post('/auth/register').send({}).expect(400);
    await request(app.getHttpServer()).post('/auth/register').send({}).expect(429);
  });
});
