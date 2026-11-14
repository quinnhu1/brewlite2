import { IsString, Length } from 'class-validator';

export class LoginDto {
  /** Email (case-insensitive) or phone number. */
  @IsString()
  @Length(3, 50)
  identifier!: string;

  @IsString()
  @Length(8, 72)
  password!: string;
}
