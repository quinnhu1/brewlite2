import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  /** Email (case-insensitive) or phone number. */
  @ApiProperty({ minLength: 3, maxLength: 50, example: 'a@test.local', description: 'Email (không phân biệt hoa thường) hoặc số điện thoại.' })
  @Transform(trim)
  @IsString()
  @Length(3, 50)
  identifier!: string;

  // Keep the upper bound generous: legacy passwords must reach bcrypt so a
  // wrong credential still returns 401 instead of a validation error.
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'test-pass-123' })
  @IsString()
  @Length(1, 200)
  password!: string;
}
