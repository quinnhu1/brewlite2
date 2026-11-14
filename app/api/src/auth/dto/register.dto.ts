import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsString()
  @Matches(/^\d{9,10}$/, {
    message: 'phone phải gồm 9–10 chữ số.',
  })
  phone!: string;

  @IsEmail({}, { message: 'email không hợp lệ.' })
  @MaxLength(50)
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;
}
