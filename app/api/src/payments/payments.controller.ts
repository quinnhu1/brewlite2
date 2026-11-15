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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthRequired,
  ApiConflict,
  ApiIdempotencyKey,
  ApiNotFound,
  ApiValidationError,
} from '../common/api-docs.js';
import { PaymentConfigDto, PaymentResponseDto } from './dto/payment-response.dto.js';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/jwt-auth.guard.js';
import { Public } from '../auth/public.decorator.js';
import { requireIdempotencyKey } from '../common/idempotency.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';
import { extractParams, verify } from './vnpay.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Cấu hình thanh toán đang bật (mock hoặc VNPay) để frontend chọn kênh' })
  @ApiOkResponse({ type: PaymentConfigDto })
  config() {
    return this.payments.getConfig();
  }

  @Post()
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Thanh toán một đơn',
    description:
      'Mock: trả kết quả ngay (Ví/Thẻ giả lập). VNPay: trả payment_url, kết quả chỉ được ghi khi IPN hoặc QueryDR có chữ ký hợp lệ. Số tiền luôn lấy từ đơn trong DB.',
  })
  @ApiIdempotencyKey('thanh toán')
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiAuthRequired()
  @ApiValidationError('Idempotency-Key cần 8–200 ký tự chữ, số, _, ., :, hoặc -.')
  @ApiConflict(
    'Đơn đã trả, hết hạn giữ hàng, đang có giao dịch chờ, hoặc key đã dùng cho yêu cầu khác.',
    'Đơn không còn ở trạng thái chờ thanh toán.',
  )
  @ApiNotFound('Không tìm thấy đơn hàng.')
  @ApiServiceUnavailableResponse({ description: 'Chưa cấu hình VNPay hoặc mock bị tắt ở production.' })
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
  @Public()
  @Get('vnpay/ipn')
  @ApiOperation({
    summary: 'IPN từ VNPay (server-to-server)',
    description: 'Chỉ VNPay gọi. Kiểm chữ ký, TmnCode, số tiền; callback lặp không cộng tiền/điểm lần hai.',
  })
  ipn(@Query() query: Record<string, unknown>) {
    return this.payments.ipn(query);
  }

  @Public()
  @Get('vnpay/return')
  @ApiExcludeEndpoint()
  returnUrl(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const target = new URL(
      '/payment/result',
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    );
    const params = extractParams(query);
    try {
      if (params && verify(params))
        target.searchParams.set('reference', params.vnp_TxnRef ?? '');
      else target.searchParams.set('error', 'signature');
    } catch {
      target.searchParams.set('error', 'configuration');
    }
    // ReturnUrl only verifies and displays. IPN or signed QueryDR updates the DB.
    return res.redirect(303, target.toString());
  }
  @Get('reference/:ref')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tra giao dịch theo mã tham chiếu (trang kết quả sau khi về từ VNPay)' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiAuthRequired()
  @ApiNotFound('Không tìm thấy giao dịch.')
  byReference(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.payments.byReference(user.user_id, ref);
  }

  @Post(':id/reconcile')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đối soát giao dịch đang chờ bằng QueryDR có chữ ký' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiAuthRequired()
  @ApiServiceUnavailableResponse({ description: 'VNPay không phản hồi hoặc chữ ký phản hồi sai: trạng thái giữ nguyên.' })
  reconcile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.reconcile(user.user_id, id);
  }
}
