import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const query = jest.fn();

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { $queryRaw: query } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "BrewLite Hello"', () => {
      expect(appController.getHello()).toBe('BrewLite Hello');
    });
  });

  it('returns a service unavailable error when the database check fails', async () => {
    query.mockRejectedValueOnce(new Error('Database disconnected'));
    await expect(appController.getHealth()).rejects.toMatchObject({ status: 503 });
  });
});
