import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
export class CreatePaymentDto {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  order_id!: string;
  @IsIn(['vnpay', 'momo', 'banking'])
  @ApiProperty({ enum: ['vnpay', 'momo', 'banking'], example: 'vnpay' })
  method!: 'vnpay' | 'momo' | 'banking';
  @IsOptional()
  @IsIn(['VNPAYQR', 'VNBANK', 'INTCARD'])
  @ApiPropertyOptional({
    enum: ['VNPAYQR', 'VNBANK', 'INTCARD'],
    description: 'Bỏ trống để chọn tại cổng VNPay.',
  })
  bank_code?: 'VNPAYQR' | 'VNBANK' | 'INTCARD';
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED'])
  @ApiPropertyOptional({
    enum: ['SUCCESS', 'FAILED'],
    description: 'Chỉ dùng với mock khi backend cho phép.',
  })
  simulate_result?: 'SUCCESS' | 'FAILED';
}
