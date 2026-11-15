import { BadRequestException } from '@nestjs/common';

/** bcrypt silently ignores everything after the first 72 UTF-8 bytes. */
export const BCRYPT_MAX_BYTES = 72;

export function assertBcryptLength(password: string): void {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    throw new BadRequestException(
      'Mật khẩu không được dài quá 72 byte (ký tự có dấu chiếm nhiều byte).',
    );
  }
}
