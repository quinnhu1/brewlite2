import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  product_id!: string;

  @IsIn(['S', 'M', 'L'])
  @ApiProperty({ enum: ['S', 'M', 'L'] })
  size!: 'S' | 'M' | 'L';

  @IsInt()
  @Min(1)
  @Max(50)
  @ApiProperty({ minimum: 1, maximum: 50, example: 1 })
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  @ApiPropertyOptional({ type: [String], example: [] })
  topping_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ maxLength: 500 })
  note?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Đơn đã hủy và hoàn xong, thuộc cùng khách hàng.',
  })
  replacement_of_order_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ApiProperty({ type: [CreateOrderItemDto], minItems: 1, maxItems: 50 })
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @ApiPropertyOptional({ example: 'BREW10' })
  promotion_code?: string;

  @IsOptional()
  @IsIn(['AT_COUNTER', 'TAKEAWAY', 'DELIVERY'])
  @ApiPropertyOptional({
    enum: ['AT_COUNTER', 'TAKEAWAY', 'DELIVERY'],
    default: 'AT_COUNTER',
  })
  pickup_method?: 'AT_COUNTER' | 'TAKEAWAY' | 'DELIVERY';

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100)
  @ApiProperty({ example: 'Nguyen Van An', minLength: 2, maxLength: 100 })
  customer_name!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^[0-9+()\-\s]{8,20}$/, {
    message: 'customer_phone phải là số điện thoại hợp lệ (8–20 ký tự)',
  })
  @ApiProperty({ example: '0901234567' })
  customer_phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ maxLength: 500 })
  delivery_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ maxLength: 500 })
  order_note?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ format: 'date-time' })
  scheduled_at?: string;
}
