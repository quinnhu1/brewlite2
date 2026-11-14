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
  product_id!: string;

  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';

  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  topping_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  promotion_code?: string;

  @IsOptional()
  @IsIn(['AT_COUNTER', 'TAKEAWAY', 'DELIVERY'])
  pickup_method?: 'AT_COUNTER' | 'TAKEAWAY' | 'DELIVERY';

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100)
  customer_name!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^[0-9+()\-\s]{8,20}$/, {
    message: 'customer_phone phải là số điện thoại hợp lệ (8–20 ký tự)',
  })
  customer_phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  delivery_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  order_note?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
