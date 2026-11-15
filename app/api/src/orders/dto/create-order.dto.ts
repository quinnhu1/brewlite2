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

/**
 * One cart line. There is deliberately NO price/cost/total field: the server reads prices from the
 * database, and the global ValidationPipe (forbidNonWhitelisted) rejects any extra field with 400.
 */
export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid', example: 'c1111111-1111-4111-8111-000000000001' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({ enum: ['S', 'M', 'L'], example: 'S', description: 'Size phải có trong product_size của món.' })
  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 50, example: 1, description: 'Số nguyên 1–50. 0, số âm, số thập phân hoặc > 50 bị 400.' })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    example: [],
    description: 'Topping phải được phép dùng với món và đang bán; không trùng lặp.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  topping_ids?: string[];

  @ApiPropertyOptional({ maxLength: 500, example: 'Ít đá' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: () => [CreateOrderItemDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'BREW10', description: 'Mã khuyến mãi; không phân biệt hoa thường.' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  promotion_code?: string;

  @ApiPropertyOptional({ enum: ['AT_COUNTER', 'TAKEAWAY', 'DELIVERY'], default: 'AT_COUNTER' })
  @IsOptional()
  @IsIn(['AT_COUNTER', 'TAKEAWAY', 'DELIVERY'])
  pickup_method?: 'AT_COUNTER' | 'TAKEAWAY' | 'DELIVERY';

  @ApiProperty({ minLength: 2, maxLength: 100, example: 'Nguyễn Văn A' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100)
  customer_name!: string;

  @ApiProperty({ example: '0901234567', pattern: '^[0-9+()\\-\\s]{8,20}$' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^[0-9+()\-\s]{8,20}$/, {
    message: 'customer_phone phải là số điện thoại hợp lệ (8–20 ký tự)',
  })
  customer_phone!: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'Bắt buộc khi pickup_method = DELIVERY.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  delivery_address?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  order_note?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Giờ nhận dự kiến, phải ở tương lai.' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
