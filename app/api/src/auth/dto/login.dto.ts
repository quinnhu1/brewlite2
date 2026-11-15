import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  /** Email (case-insensitive) or phone number. */
  @Transform(trim)
  @IsString()
  @Length(3, 50)
  identifier!: string;

  // Keep the upper bound generous: legacy passwords must reach bcrypt so a
  // wrong credential still returns 401 instead of a validation error.
  @IsString()
  @Length(1, 200)
  password!: string;
}
