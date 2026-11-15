<<<<<<< HEAD
=======
import { ApiPropertyOptional } from '@nestjs/swagger';
>>>>>>> 578391e (cập nhật forder ath)
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
<<<<<<< HEAD
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
=======
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'new-password' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password?: string;
>>>>>>> 578391e (cập nhật forder ath)
}
