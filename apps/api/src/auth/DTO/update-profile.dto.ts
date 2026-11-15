import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    example: 'newPassword123',
    description: 'Ít nhất 8 ký tự, có chữ cái và chữ số; tối đa 72 byte UTF-8.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: 'Mật khẩu mới phải có ít nhất một chữ cái và một chữ số',
  })
  password?: string;

  @ApiPropertyOptional({ description: 'Bắt buộc khi đổi mật khẩu; không lưu hoặc ghi log.' })
  @ValidateIf((value: UpdateProfileDto) => value.password !== undefined || value.current_password !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  current_password?: string;
}
