import { expect, test } from '@playwright/test';

const orderId = '10000000-0000-4000-8000-000000000001';
const paymentId = '20000000-0000-4000-8000-000000000001';

// The web app runs on :3100, while API requests go to :3101. Mocked API
// responses must include CORS headers, just like the real NestJS server does.
const apiCorsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:3100',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Authorization, Content-Type, Idempotency-Key',
};
async function fulfillApi(route, json = {}, status = 200) {
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: apiCorsHeaders });
  }
  return route.fulfill({ status, headers: apiCorsHeaders, json });
}
async function fixture(page, pending = false) {
  const payment = { payment_id: paymentId, provider: 'vnpay', method: 'vnpay',
    status: pending ? 'pending' : 'failed', bank_code: 'VNPAYQR',
    idempotency_key: 'old-payment-key', amount: 29000, response_code: pending ? null : '24',
    payment_url: pending ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?old=1' : null,
    next_check_at: null, paid_at: null, created_at: new Date().toISOString() };
  const order = { order_id: orderId, order_code: 'TEST-QR', status: pending ? 'PENDING' : 'PAYMENT_FAILED',
    customer_name: 'Test Customer', customer_phone: '0900000000', pickup_method: 'AT_COUNTER',
    total: 29000, subtotal: 29000, discount: 0, items: [], refunds: [], payment,
    payment_attempts: [payment], cancellation_requested_at: null, message: null,
    actions: { can_change_method: true, can_retry_payment: !pending, can_resume_payment: pending,
      can_reconcile: pending, can_cancel: false, can_replace: false } };
  await page.addInitScript(() => localStorage.setItem('token', 'browser-fixture'));
  await page.route('**/auth/me', route => fulfillApi(route, { user_id: 'user-fixture', name: 'Test Customer', phone: '0900000000', role: 'customer' }));
  await page.route('**/payments/config', route => fulfillApi(route, {
    provider: 'vnpay', configured: true, environment: 'sandbox', allow_simulate: false,
  }));
  await page.route(`**/orders/${orderId}`, route => fulfillApi(route, order));
  // Only UI transport is stubbed here; signed URLs and DB transitions have PostgreSQL tests.
  await page.route('https://sandbox.vnpayment.vn/**', route => route.fulfill({ body: 'Sandbox navigation intercepted for UI test' }));
  return order;
}

test('offers exactly QR and card, then retries a failed QR with a new key and card channel', async ({ page }) => {
  await fixture(page);
  const attempts = [];
  await page.route('**/payments', async route => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route);
    const body = route.request().postDataJSON();
    const key = route.request().headers()['idempotency-key'];
    attempts.push({ body, key });
    await fulfillApi(route, {
      payment_id: paymentId, idempotency_key: key,
      payment_status: 'failed', payment_url: null,
    });
  });
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole('region', { name: 'Thanh toán đơn' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await page.getByRole('radio', { name: 'VNPay QR (Sandbox)', exact: true }).check();
  await page.getByRole('button', { name: 'Thanh toán / thử lại', exact: true }).click();
  await expect(page.locator('main p[role="alert"]')).toContainText('Thanh toán thất bại');
  await expect(page.getByRole('radio', { name: 'Thẻ ngân hàng', exact: true })).toBeEnabled();
  await page.getByRole('radio', { name: 'Thẻ ngân hàng', exact: true }).check();
  await page.getByLabel('Loại thẻ').selectOption('INTCARD');
  await page.getByRole('button', { name: 'Thanh toán / thử lại', exact: true }).click();
  await expect.poll(() => attempts.length).toBe(2);
  expect(attempts.map(a => a.body.bank_code)).toEqual(['VNPAYQR', 'INTCARD']);
  expect(attempts[0].key).not.toBe(attempts[1].key);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Thẻ ngân hàng', exact: true })).toBeEnabled();
});

test('a pending legacy QR can select a card without POSTing another payment', async ({ page }) => {
  await fixture(page, true);
  let creates = 0;
  let selected;
  await page.route('**/payments', route => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route);
    creates++;
    return fulfillApi(route, { message: 'Unexpected payment create' }, 500);
  });
  await page.route(`**/payments/${paymentId}/gateway`, route => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route);
    selected = route.request().postDataJSON();
    return fulfillApi(route, {
      payment_id: paymentId, payment_status: 'pending',
      payment_url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?same_reference=1',
    });
  });
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole('region', { name: 'Thanh toán đơn' })).toBeVisible();
  await page.getByRole('radio', { name: 'Thẻ ngân hàng', exact: true }).check();
  await page.getByRole('button', { name: 'Tiếp tục với phương thức đã chọn', exact: true }).click();
  await expect(page).toHaveURL(/sandbox\.vnpayment\.vn/);
  expect(selected).toEqual({ bank_code: 'VNBANK' });
  expect(creates).toBe(0);
});
