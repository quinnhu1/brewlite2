import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service.js';

@Module({ providers: [RefundsService], exports: [RefundsService] })
export class RefundsModule {}
