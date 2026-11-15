<<<<<<< HEAD:apps/api/src/admin/admin.module.ts
import { PaymentsModule } from '../payments/payments.module.js';
import { RefundsModule } from '../refunds/refunds.module.js';
=======
>>>>>>> origin/main:app/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
@Module({
<<<<<<< HEAD:apps/api/src/admin/admin.module.ts
  imports: [AuthModule, OrdersModule, PaymentsModule, RefundsModule],
=======
  imports: [AuthModule, OrdersModule],
>>>>>>> origin/main:app/api/src/admin/admin.module.ts
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
