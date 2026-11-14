import { IsIn, IsOptional, IsUUID } from 'class-validator';
export class CreatePaymentDto {
  @IsUUID()
  order_id!: string;
  @IsIn(['vnpay', 'momo', 'banking'])
  method!: 'vnpay' | 'momo' | 'banking';
  @IsOptional()
  @IsIn(['VNPAYQR', 'VNBANK', 'INTCARD'])
  bank_code?: 'VNPAYQR' | 'VNBANK' | 'INTCARD';
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED'])
  simulate_result?: 'SUCCESS' | 'FAILED';
}
