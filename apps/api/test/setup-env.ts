const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl || !new URL(testDatabaseUrl).pathname.endsWith('_test')) {
  throw new Error(
    'TEST_DATABASE_URL must point to a disposable *_test database.',
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;
process.env.JWT_SECRET = 'integration-test-only-long-secret';
process.env.ORDER_EXPIRY_WORKER = 'false';

process.env.PAYMENT_RECONCILE_WORKER = 'false';
