import { expect, test } from '@playwright/test';
import { randomInt } from 'node:crypto';

test('a customer retries checkout and confirms the same order', async ({ page, request }, testInfo) => {
  const id = String(randomInt(100_000_000)).padStart(8, '0');
  const email = `checkout-${id}@test.local`;
  const password = 'browser-test-123';

  await page.goto('/signup');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Full name').fill('BrewLite E2E');
  await page.getByLabel('Phone number').fill(`09${id}`);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/signin\?registered=1$/);

  await page.getByLabel('Email or phone').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();

  await page.goto('/menu?category=Classic%20Coffee');
  await page.getByRole('button').filter({
    has: page.getByRole('heading', { name: 'Espresso', exact: true }),
  }).click();
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(page.getByText('Espresso added to your cart.', { exact: true })).toBeVisible();
  await page.goto('/cart');
  await page.getByRole('button', { name: 'PAYMENT', exact: true }).click();
  await page.getByRole('button', { name: 'Kiểm tra giá và tiếp tục' }).click();

  const paymentResult = page.getByLabel('Kết quả thanh toán giả lập');
  const confirm = page.getByRole('button', { name: 'CONFIRM · Tiếp tục thanh toán' });
  const orders = async () => {
    const response = await request.get(`${testInfo.config.metadata.api}/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).items;
  };
  await paymentResult.selectOption('FAILED');
  await confirm.click();
  await expect(page.getByText(/Giỏ hàng vẫn được giữ để bạn thử lại/)).toBeVisible();
  const [failed] = await orders();
  expect(failed.status).toBe('PAYMENT_FAILED');

  await paymentResult.selectOption('SUCCESS');
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'Successful!', exact: true })).toBeVisible();
  const paid = await orders();
  expect(paid).toHaveLength(1);
  expect(paid[0]).toMatchObject({ order_id: failed.order_id, status: 'PAID' });
  await page.getByRole('button', { name: 'TRACK ORDER' }).click();
  await expect(page).toHaveURL(`/orders/${failed.order_id}`);
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});
