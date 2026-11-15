import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD:apps/api/src/app.controller.spec.ts
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const query = jest.fn();
=======

describe('AppController', () => {
  let appController: AppController;
>>>>>>> origin/main:app/api/src/app.controller.spec.ts

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
<<<<<<< HEAD:apps/api/src/app.controller.spec.ts
      providers: [AppService, { provide: PrismaService, useValue: { $queryRaw: query } }],
=======
      providers: [AppService],
>>>>>>> origin/main:app/api/src/app.controller.spec.ts
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "BrewLite Hello"', () => {
      expect(appController.getHello()).toBe('BrewLite Hello');
    });
  });

<<<<<<< HEAD:apps/api/src/app.controller.spec.ts
  it('returns a service unavailable error when the database check fails', async () => {
    query.mockRejectedValueOnce(new Error('Database disconnected'));
    await expect(appController.getHealth()).rejects.toMatchObject({ status: 503 });
=======
  describe('health', () => {
    it('reports ok for the deploy probes', () => {
      const health = appController.health();
      expect(health.status).toBe('ok');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
    });
>>>>>>> origin/main:app/api/src/app.controller.spec.ts
  });
});
