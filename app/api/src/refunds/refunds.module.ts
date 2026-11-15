import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service.js';

/** No controller here: receipts are served by OrdersController and AdminController. */
@Module({
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
