import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ maxLength: 50, example: 'Nguyễn Văn A' })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiProperty({ example: '0901234567', pattern: '^0\\d{9}$', description: '10 chữ số, bắt đầu bằng 0.' })
  @Transform(trim)
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'phone phải gồm 10 chữ số và bắt đầu bằng 0.',
  })
  phone!: string;

  @ApiProperty({ format: 'email', maxLength: 50, example: 'a@test.local' })
  @Transform(trim)
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @MaxLength(50)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'test-pass-123', description: 'Ít nhất một chữ cái và một chữ số.' })
  @IsString()
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  })
  password!: string;
}
