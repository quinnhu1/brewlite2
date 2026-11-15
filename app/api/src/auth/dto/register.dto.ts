<<<<<<< HEAD
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
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  name!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'phone phải gồm 10 chữ số và bắt đầu bằng 0.',
  })
  phone!: string;

  @Transform(trim)
  @IsEmail({}, { message: 'email không hợp lệ.' })
=======
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'long@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email không hợp lệ' })
>>>>>>> 578391e (cập nhật forder ath)
  @MaxLength(50)
  email: string;

  @ApiProperty({ example: 'Đức Long' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
<<<<<<< HEAD
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  })
  password!: string;
=======
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '0901234567' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0',
  })
  phone: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password: string;
>>>>>>> 578391e (cập nhật forder ath)
}
