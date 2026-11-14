import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "BrewLite Hello"', () => {
      expect(appController.getHello()).toBe('BrewLite Hello');
    });
  });

  describe('health', () => {
    it('reports ok for the deploy probes', () => {
      const health = appController.health();
      expect(health.status).toBe('ok');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
    });
  });
});
