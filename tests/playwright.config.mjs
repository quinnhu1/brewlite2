import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const db = process.env.TEST_DATABASE_URL;
if (!db || !new URL(db).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a disposable *_test database.');
}

const root = fileURLToPath(new URL('..', import.meta.url));
const web = 'http://127.0.0.1:3100';
const api = 'http://127.0.0.1:3101';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  metadata: { api },
  use: {
    ...devices['Pixel 7'],
    browserName: 'chromium',
    baseURL: web,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: 'npm --prefix apps/api run start',
      cwd: root,
      url: `${api}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        PORT: '3101',
        FRONTEND_URL: web,
        DATABASE_URL: db,
        DIRECT_URL: db,
        JWT_SECRET: 'browser-test-only-long-secret',
        ORDER_EXPIRY_WORKER: 'false',
        PAYMENT_PROVIDER: 'mock',
        PAYMENT_MOCK_ALLOW_OVERRIDE: 'true',
        PAYMENT_ALLOW_MOCK_IN_PRODUCTION: 'true',
      },
    },
    {
      command: 'npm --prefix apps/web run dev -- --hostname 127.0.0.1 --port 3100',
      cwd: root,
      url: `${web}/signin`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: api,
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
});
