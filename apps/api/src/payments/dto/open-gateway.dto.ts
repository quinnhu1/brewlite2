import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class OpenGatewayDto {
  @IsOptional()
  @IsIn(['VNPAYQR', 'VNBANK', 'INTCARD'])
  @ApiPropertyOptional({
    enum: ['VNPAYQR', 'VNBANK', 'INTCARD'],
    description: 'Đổi kênh trong cùng phiên; bỏ trống để mở màn chọn của VNPay.',
  })
  bank_code?: 'VNPAYQR' | 'VNBANK' | 'INTCARD';
}
