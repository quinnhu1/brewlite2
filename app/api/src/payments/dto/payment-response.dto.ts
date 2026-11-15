import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' }) payment_id!: string;
  @ApiProperty({ format: 'uuid' }) order_id!: string;
  @ApiProperty({ example: 'BL-20261115-1A2B3C4D5E' }) order_code!: string;
  @ApiProperty({ example: 'SUCCESS', enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] }) status!: string;
  @ApiProperty({ example: 'success', enum: ['pending', 'success', 'failed', 'refunded'] }) payment_status!: string;
  @ApiProperty({ example: 'PAID' }) order_status!: string;
  @ApiProperty({ example: 'mock', enum: ['mock', 'vnpay', 'free'] }) provider!: string;
  @ApiPropertyOptional({ nullable: true, example: null, description: 'Mã phản hồi VNPay (chỉ khi provider = vnpay).' })
  response_code!: string | null;
  @ApiProperty({ enum: ['momo', 'vnpay', 'banking'] }) method!: string;
  @ApiProperty({ example: 30000 }) amount!: number;
  @ApiPropertyOptional({ nullable: true, example: 'MOCK-5d2c...' }) transaction_id!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) paid_at!: string | null;
  @ApiProperty({ example: 'pay-6b1f2c7e-3d4a-4c1b-9e0f-2a7d5c8b1e40' }) idempotency_key!: string;
  @ApiPropertyOptional({ nullable: true, description: 'Mã tham chiếu gửi sang cổng (vnp_TxnRef).' })
  reference!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Link cổng VNPay, chỉ có khi status = PENDING.' })
  payment_url!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) expires_at!: string | null;
}

export class PaymentConfigDto {
  @ApiProperty({ enum: ['vnpay', 'mock'] }) provider!: string;
  @ApiProperty() configured!: boolean;
  @ApiProperty({ type: [String], example: [] }) channels!: string[];
  @ApiProperty({ type: [String], example: ['momo', 'banking'] }) methods!: string[];
  @ApiProperty({ description: 'true: cho phép gửi simulate_result để demo thất bại/thành công.' })
  allow_simulate!: boolean;
}
