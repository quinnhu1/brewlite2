import { Controller, Get } from '@nestjs/common';
<<<<<<< HEAD:apps/api/src/app.controller.ts
import { AppService } from './app.service';

=======
import { AppService } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@Public()
>>>>>>> origin/main:app/api/src/app.controller.ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'BrewLite Hello';
  }

<<<<<<< HEAD:apps/api/src/app.controller.ts
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
=======
  /**
   * Liveness probe for the container health check, the reverse proxy and the
   * deployment smoke test. It intentionally touches no dependency: the
   * release pipeline runs migrations before the app starts, so a failing
   * database surfaces during that step instead of as a restart loop.
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
>>>>>>> origin/main:app/api/src/app.controller.ts
  }
}
