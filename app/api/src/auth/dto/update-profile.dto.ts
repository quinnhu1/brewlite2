import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'phone phải gồm 10 chữ số và bắt đầu bằng 0.',
  })
  phone?: string;
}
