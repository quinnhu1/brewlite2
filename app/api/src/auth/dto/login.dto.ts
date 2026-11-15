<<<<<<< HEAD
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
=======
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
>>>>>>> 578391e (cập nhật forder ath)

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
<<<<<<< HEAD
  /** Email (case-insensitive) or phone number. */
  @Transform(trim)
=======
  @ApiProperty({
    example: 'long@example.com',
    description: 'Email hoặc số điện thoại đã đăng ký',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
>>>>>>> 578391e (cập nhật forder ath)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập email hoặc số điện thoại' })
  @MaxLength(50)
  identifier: string;

<<<<<<< HEAD
  // Keep the upper bound generous: legacy passwords must reach bcrypt so a
  // wrong credential still returns 401 instead of a validation error.
  @IsString()
  @Length(1, 200)
  password!: string;
=======
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(72)
  password: string;
>>>>>>> 578391e (cập nhật forder ath)
}
