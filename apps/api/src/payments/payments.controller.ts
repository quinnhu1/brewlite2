import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard.js';
import { requireIdempotencyKey } from '../common/idempotency.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';
import { extractParams, verify } from './vnpay.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get('config')
  config() {
    return this.payments.getConfig();
  }

  @Post()
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.payments.createPayment(
      user.user_id,
      dto,
      requireIdempotencyKey(key),
      req.ip ?? '127.0.0.1',
    );
  }
  @Get('vnpay/ipn')
  ipn(@Query() query: Record<string, unknown>) {
    return this.payments.ipn(query);
  }

  @Get('vnpay/return')
  async returnUrl(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const target = new URL(
      '/payment/result',
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    );
    const params = extractParams(query);
    try {
      if (params && verify(params)) {
        target.searchParams.set('reference', params.vnp_TxnRef ?? '');
        // The browser return carries the same signed result as IPN. Apply it as
        // a fallback so a successful payment is not left pending when the
        // merchant portal's IPN callback is missing or delayed.
        await this.payments.ipn(query);
      } else target.searchParams.set('error', 'signature');
    } catch {
      target.searchParams.set('error', 'configuration');
    }
    return res.redirect(303, target.toString());
  }
  @Get('reference/:ref')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  byReference(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.payments.byReference(user.user_id, ref);
  }

  @Post(':id/reconcile')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  reconcile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.reconcile(user.user_id, id);
  }
}
