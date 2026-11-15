import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export const categories = [
  'Classic Coffee',
  'Cold & Brewed',
  'Tea',
  'Pastry & Dessert',
] as const;
export class SizeDto {
  @ApiProperty({ enum: ['S', 'M', 'L'] })
  @IsIn(['S', 'M', 'L']) size!: 'S' | 'M' | 'L';
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 99999, example: 5000, description: 'Phụ thu so với giá gốc (VND).' })
  @IsInt() @Min(0) @Max(99999) addPrice!: number;
}
export class ProductDto {
  @ApiProperty({ maxLength: 50, example: 'Cà phê sữa đá' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 50)
  productName!: string;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty({ type: 'integer', minimum: 0, example: 29000, description: 'Giá gốc (VND), số nguyên.' })
  @IsInt() @Min(0) @Max(9999999999) basePrice!: number;
  @ApiProperty({ maxLength: 1000, example: '/images/espresso.jpg' })
  @IsString() @MaxLength(1000) imageUrl!: string;
  @ApiProperty({ enum: categories })
  @IsIn(categories) categories!: string;
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000, example: 50 })
  @IsInt() @Min(0) @Max(1000000) stock!: number;
  @ApiProperty()
  @IsBoolean() isActive!: boolean;
  @ApiProperty({ type: () => [SizeDto], minItems: 1, maxItems: 3, description: 'Đồ uống cần đủ S/M/L; bánh dùng một size.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique((x: SizeDto) => x.size)
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  sizes!: SizeDto[];
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 30, example: [] })
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  toppingIds!: string[];
  @ApiPropertyOptional({ type: 'integer', minimum: 1, description: 'Version đang sửa; lệch với DB thì 409 (khóa lạc quan).' })
  @IsOptional() @IsInt() @Min(1) version?: number;
}
export class AdminStatusDto {
  @ApiProperty({ enum: ['preparing', 'ready', 'completed'], description: 'Chỉ đi đúng chuỗi paid → preparing → ready → completed.' })
  @IsIn(['preparing', 'ready', 'completed']) status!:
    'preparing' | 'ready' | 'completed';
}
