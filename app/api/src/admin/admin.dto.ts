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
  @IsIn(['S', 'M', 'L']) size!: 'S' | 'M' | 'L';
  @IsInt() @Min(0) @Max(99999) addPrice!: number;
}
export class ProductDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 50)
  productName!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsInt() @Min(0) @Max(9999999999) basePrice!: number;
  @IsString() @MaxLength(1000) imageUrl!: string;
  @IsIn(categories) categories!: string;
  @IsInt() @Min(0) @Max(1000000) stock!: number;
  @IsBoolean() isActive!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique((x: SizeDto) => x.size)
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  sizes!: SizeDto[];
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  toppingIds!: string[];
  @IsOptional() @IsInt() @Min(1) version?: number;
}
export class AdminStatusDto {
  @IsIn(['preparing', 'ready', 'completed']) status!:
    'preparing' | 'ready' | 'completed';
}
