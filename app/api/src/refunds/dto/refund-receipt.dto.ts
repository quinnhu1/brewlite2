import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundReceiptDto {
  @ApiProperty({ format: 'uuid', example: '6f3c2a3e-0d2b-4a8e-9a55-8a5f0c1d2e3f' })
  refund_id!: string;

  @ApiProperty({ format: 'uuid' })
  order_id!: string;

  @ApiProperty({ format: 'uuid' })
  payment_id!: string;

  @ApiProperty({ description: 'Số tiền hoàn (VND). Đơn miễn phí có amount = 0.', example: 29000 })
  amount!: number;

  @ApiProperty({ enum: ['pending', 'succeeded', 'failed'], example: 'succeeded' })
  status!: 'pending' | 'succeeded' | 'failed';

  @ApiProperty({ example: 'mock', description: 'mock/free: hoàn nội bộ, không phải hoàn qua ngân hàng.' })
  provider!: string;

  @ApiProperty({ example: 'CUSTOMER_CANCEL' })
  reason!: string;

  @ApiPropertyOptional({ example: 'MOCK-RF-1A2B3C4D5E6F7A8B9C0D', nullable: true })
  provider_ref!: string | null;

  @ApiProperty({ format: 'date-time' })
  requested_at!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completed_at!: string | null;
}

export class AdminRefundReceiptDto extends RefundReceiptDto {
  @ApiProperty({ format: 'uuid', description: 'Người yêu cầu hoàn (khách hoặc nhân viên).' })
  requested_by!: string;
}
