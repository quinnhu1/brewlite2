import { ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export type VnpParams = Record<string, string>;
const gatewayUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const queryUrl = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

function credentials() {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const secret = process.env.VNPAY_HASH_SECRET?.trim();
  if (!tmnCode || !/^[a-z0-9]{8}$/i.test(tmnCode) || !secret)
    return null;
  return { tmnCode, secret };
}

function requireCredentials() {
  const merchant = credentials();
  if (!merchant)
    throw new ServiceUnavailableException('Thiếu cấu hình merchant VNPay Sandbox.');
  return merchant;
}

export function config() {
  const merchant = credentials();
  const url = URL.parse(process.env.VNPAY_RETURN_URL?.trim() ?? '');
  if (
    !merchant ||
    !url ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.href.length > 255
  )
    return null;
  return { ...merchant, returnUrl: url.href };
}

export function vnpDate(date: Date) {
  return new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, '');
}

function encode(value: string) {
  return encodeURIComponent(value)
    .replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%20/g, '+');
}

export function canonical(params: VnpParams) {
  return Object.keys(params)
    .filter(
      (key) =>
        key.startsWith('vnp_') &&
        !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key),
    )
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

export function hmac(data: string, secret: string) {
  return createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

export function validHash(actual: string | undefined, expected: string) {
  if (!actual || !/^[a-f0-9]{128}$/i.test(actual)) return false;
  return timingSafeEqual(
    Buffer.from(actual, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}

export function extractParams(
  query: Record<string, unknown>,
): VnpParams | null {
  const params: VnpParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('vnp_')) continue;
    // Reject duplicate/nested parameters instead of signing a coerced value.
    if (typeof value !== 'string' || value.length > 2048) return null;
    params[key] = value;
  }
  return params;
}

export function verify(params: VnpParams) {
  const { tmnCode, secret } = requireCredentials();
  return (
    params.vnp_TmnCode === tmnCode &&
    validHash(params.vnp_SecureHash, hmac(canonical(params), secret))
  );
}

export function normalizeIp(ip: string) {
  const value = ip.replace(/^::ffff:/, '');
  return value !== '::1' && isIP(value) ? value : '127.0.0.1';
}

export function createUrl(input: {
  amount: number;
  ref: string;
  orderCode: string;
  now: Date;
  expires: Date;
  ip: string;
  bankCode?: string;
}) {
  const settings = config();
  if (!settings)
    throw new ServiceUnavailableException(
      'Thiếu cấu hình merchant VNPay Sandbox hoặc VNPAY_RETURN_URL không hợp lệ.',
    );
  const { tmnCode, secret, returnUrl } = settings;
  const orderCode = input.orderCode.replace(/[^a-z0-9]/gi, ' ').trim();
  const params: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(input.amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: input.ref,
    vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: normalizeIp(input.ip),
    vnp_CreateDate: vnpDate(input.now),
    vnp_ExpireDate: vnpDate(input.expires),
  };
  if (input.bankCode) params.vnp_BankCode = input.bankCode;
  const data = canonical(params);
  return `${gatewayUrl}?${data}&vnp_SecureHash=${hmac(data, secret)}`;
}

export function parsePayDate(value?: string) {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const date = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+07:00`,
  );
  return Number.isNaN(date.getTime()) || vnpDate(date) !== value ? null : date;
}

/** QueryDR uses a pipe-delimited signature, unlike the payment URL/IPN. */
export async function queryTransaction(ref: string, createDate: string) {
  const { tmnCode, secret } = requireCredentials();
  const request: VnpParams = {
    vnp_RequestId: randomBytes(16).toString('hex'),
    vnp_Version: '2.1.0',
    vnp_Command: 'querydr',
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: ref,
    vnp_TransactionDate: createDate,
    vnp_CreateDate: vnpDate(new Date()),
    vnp_IpAddr: normalizeIp(process.env.VNPAY_QUERY_IP ?? '127.0.0.1'),
    vnp_OrderInfo: `Query transaction ${ref}`,
  };
  const requestFields = [
    'vnp_RequestId',
    'vnp_Version',
    'vnp_Command',
    'vnp_TmnCode',
    'vnp_TxnRef',
    'vnp_TransactionDate',
    'vnp_CreateDate',
    'vnp_IpAddr',
    'vnp_OrderInfo',
  ];
  request.vnp_SecureHash = hmac(
    requestFields.map((key) => request[key]).join('|'),
    secret,
  );
  let response: Response;
  try {
    response = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ServiceUnavailableException('Chưa kết nối được máy chủ VNPay.');
  }
  if (!response.ok)
    throw new ServiceUnavailableException('VNPay chưa phản hồi truy vấn.');
  const raw: unknown = await response.json().catch(() => null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new ServiceUnavailableException('Phản hồi VNPay không hợp lệ.');
  const data: VnpParams = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number')
      data[key] = String(value);
  }
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
  if (
    !validHash(
      data.vnp_SecureHash,
      hmac(fields.map((key) => data[key] ?? '').join('|'), secret),
    ) ||
    data.vnp_TmnCode !== tmnCode ||
    data.vnp_TxnRef !== ref ||
    data.vnp_Command !== 'querydr'
  ) {
    throw new ServiceUnavailableException(
      'Không xác thực được phản hồi truy vấn VNPay.',
    );
  }
  return data;
}
