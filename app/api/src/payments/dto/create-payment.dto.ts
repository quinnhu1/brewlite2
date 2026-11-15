import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
/** Amount is never sent by the client: the server charges orders.total of the caller's own order. */
export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid', description: 'Đơn của chính người gọi, đang PENDING/PAYMENT_FAILED và còn hạn giữ hàng.' })
  @IsUUID()
  order_id!: string;

  @ApiProperty({
    enum: ['vnpay', 'momo', 'banking'],
    example: 'momo',
    description: 'Xem GET /payments/config: mock nhận momo/banking (Ví/Thẻ giả lập), vnpay chỉ nhận vnpay.',
  })
  @IsIn(['vnpay', 'momo', 'banking'])
  method!: 'vnpay' | 'momo' | 'banking';

  @ApiPropertyOptional({ enum: ['VNPAYQR', 'VNBANK', 'INTCARD'], description: 'Kênh VNPay (chỉ dùng với method = vnpay).' })
  @IsOptional()
  @IsIn(['VNPAYQR', 'VNBANK', 'INTCARD'])
  bank_code?: 'VNPAYQR' | 'VNBANK' | 'INTCARD';

  @ApiPropertyOptional({
    enum: ['SUCCESS', 'FAILED'],
    description: 'Chỉ khi allow_simulate = true (mock, môi trường demo). Bị 400 nếu backend tắt giả lập.',
  })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED'])
  simulate_result?: 'SUCCESS' | 'FAILED';
}
