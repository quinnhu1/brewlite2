import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(new URL(`../../apps/web/src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
Object.defineProperty(globalThis, 'window', { value: { localStorage: storage }, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
const { useCartStore: store } = await import('../../apps/web/src/store/useCartStore.ts');
const { syncCheckoutWithOrder } = await import('../../apps/web/src/lib/checkout/sync.ts');
hooks.deregister();

beforeEach(() => {
  store.getState().clearSession();
  store.getState().bindUser('customer');
  store.getState().setCheckout({ userId: 'customer', orderId: 'order', key: 'order-key',
    paymentKey: 'browser-key', paymentBody: { order_id: 'order', method: 'vnpay', bank_code: 'VNPAYQR' },
    body: { items: [], pickup_method: 'AT_COUNTER' }, rows: [] });
});

test('a confirmed failed server attempt unlocks stale QR intent from another tab', () => {
  syncCheckoutWithOrder({ order_id: 'order', status: 'PAYMENT_FAILED',
    payment: { status: 'failed', idempotency_key: 'server-canonical-key' },
    actions: { can_retry_payment: true } });
  const checkout = store.getState().checkout;
  assert.equal(checkout.orderId, 'order');
  assert.equal(checkout.key, 'order-key');
  assert.equal(checkout.paymentBody, undefined);
  assert.notEqual(checkout.paymentKey, 'browser-key');
});

test('an unresolved payment preserves the request key and body across refresh', () => {
  const before = store.getState().checkout;
  syncCheckoutWithOrder({ order_id: 'order', status: 'PENDING',
    payment: { status: 'pending', idempotency_key: 'server-key' },
    actions: { can_retry_payment: false } });
  assert.deepEqual(store.getState().checkout, before);
});

test('a different order failure cannot unlock this checkout', () => {
  const before = store.getState().checkout;
  syncCheckoutWithOrder({ order_id: 'another-order', status: 'PAYMENT_FAILED',
    payment: { status: 'failed', idempotency_key: 'browser-key' },
    actions: { can_retry_payment: true } });
  assert.deepEqual(store.getState().checkout, before);
});

test('repeated failed-state polling rotates the retry key only once', () => {
  const failed = { order_id: 'order', status: 'PAYMENT_FAILED',
    payment: { status: 'failed', idempotency_key: 'browser-key' },
    actions: { can_retry_payment: true } };
  syncCheckoutWithOrder(failed);
  const first = store.getState().checkout.paymentKey;
  syncCheckoutWithOrder(failed);
  assert.equal(store.getState().checkout.paymentKey, first);
});
