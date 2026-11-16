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
import { ApiBearerAuth, ApiTags, ApiHeader } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard.js';
import { requireIdempotencyKey } from '../common/idempotency.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { OpenGatewayDto } from './dto/open-gateway.dto.js';
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
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      '8–200 ký tự. Lặp cùng thao tác giữ nguyên key và body; lần thử mới sau FAILED dùng key mới.',
    example: 'checkout-demo-0001',
  })
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
  async returnUrl(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const target = new URL(
      '/payment/result',
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    );
    const params = extractParams(query);
    try {
      if (params && verify(params)) {
        target.searchParams.set('reference', params.vnp_TxnRef ?? '');
        if (/^\d{2}$/.test(params.vnp_ResponseCode ?? ''))
          target.searchParams.set('gateway_code', params.vnp_ResponseCode);
        // Scheduling failure must not hide the reference; polling and IPN can still recover.
        await this.payments.scheduleReturnCheck(params).catch(() => undefined);
      } else target.searchParams.set('error', 'signature');
    } catch {
      target.searchParams.set('error', 'configuration');
    }
    // ReturnUrl only verifies and displays. IPN or signed QueryDR updates the DB.
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

  @Post(':id/gateway')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  openGateway(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenGatewayDto,
  ) {
    return this.payments.openGateway(user.user_id, id, dto.bank_code);
  }
}
