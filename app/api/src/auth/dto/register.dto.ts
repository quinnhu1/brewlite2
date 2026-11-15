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
  @MaxLength(50)
  email!: string;

  @IsString()
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  })
  password!: string;
}
