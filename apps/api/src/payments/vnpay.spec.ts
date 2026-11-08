import {
  canonical,
  config,
  createUrl,
  extractParams,
  hmac,
  parsePayDate,
  verify,
  vnpDate,
} from './vnpay.js';
describe('VNPay protocol', () => {
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'unit-test-secret';
    process.env.VNPAY_RETURN_URL =
      'http://localhost:3001/payments/vnpay/return';
  });
  it('uses GMT+7 independently of the API host timezone', () => {
    expect(vnpDate(new Date('2026-11-01T18:00:00Z'))).toBe('20261102010000');
    expect(parsePayDate('20261102010000')?.toISOString()).toBe(
      '2026-11-01T18:00:00.000Z',
    );
    expect(parsePayDate('20260230010000')).toBeNull();
  });
  it('sorts and URL encodes using the VNPay 2.1.0 form convention', () => {
    expect(
      canonical({
        vnp_TxnRef: '1',
        vnp_OrderInfo: 'a b/!()*',
        vnp_SecureHash: 'ignored',
      }),
    ).toBe('vnp_OrderInfo=a+b%2F%21%28%29%2A&vnp_TxnRef=1');
  });
  it('creates a signed URL with a plain order description and a usable loopback IP', () => {
    const url = new URL(
      createUrl({
        amount: 29000,
        ref: 'abc123',
        orderCode: 'BL-20261107-ABCD',
        ip: '::1',
        now: new Date('2026-11-07T12:00:00Z'),
        expires: new Date('2026-11-07T12:20:00Z'),
      }),
    );
    expect(url.searchParams.get('vnp_OrderInfo')).toBe(
      'Thanh toan don hang BL 20261107 ABCD',
    );
    expect(url.searchParams.get('vnp_IpAddr')).toBe('127.0.0.1');
    expect(url.searchParams.has('vnp_BankCode')).toBe(false);
    expect(verify(Object.fromEntries(url.searchParams))).toBe(true);
  });
  it('blocks new sessions with a malformed return URL while still verifying callbacks', () => {
    expect(config()).not.toBeNull();
    process.env.VNPAY_RETURN_URL = 'not-a-url';
    expect(config()).toBeNull();
    const params = { vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'abc123' };
    expect(
      verify({
        ...params,
        vnp_SecureHash: hmac(canonical(params), 'unit-test-secret'),
      }),
    ).toBe(true);
  });
  it('rejects tampering, malformed hashes and repeated query parameters', () => {
    const params = {
      vnp_TmnCode: 'TESTCODE',
      vnp_Amount: '10000',
      vnp_SecureHash: '',
    };
    params.vnp_SecureHash = hmac(canonical(params), 'unit-test-secret');
    expect(verify(params)).toBe(true);
    expect(verify({ ...params, vnp_Amount: '20000' })).toBe(false);
    expect(verify({ ...params, vnp_SecureHash: 'a' })).toBe(false);
    expect(extractParams({ vnp_Amount: ['10000', '20000'] })).toBeNull();
  });
});
