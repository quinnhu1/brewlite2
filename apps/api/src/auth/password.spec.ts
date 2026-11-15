import { BadRequestException } from '@nestjs/common';
import { assertBcryptLength, BCRYPT_MAX_BYTES } from './password.js';

describe('assertBcryptLength', () => {
  it('accepts exactly 72 UTF-8 bytes, including multi-byte Vietnamese characters', () => {
    const password = `a1${'ế'.repeat(23)}x`;
    expect(Buffer.byteLength(password, 'utf8')).toBe(BCRYPT_MAX_BYTES);
    expect(() => assertBcryptLength(password)).not.toThrow();
  });

  it('rejects passwords over 72 UTF-8 bytes even when their character count is small', () => {
    const password = `a1${'ế'.repeat(24)}`;
    expect(password.length).toBeLessThan(72);
    expect(Buffer.byteLength(password, 'utf8')).toBe(74);
    expect(() => assertBcryptLength(password)).toThrow(BadRequestException);
  });

  it('accepts an ordinary 72-character ASCII password', () => {
    expect(() => assertBcryptLength(`a1${'b'.repeat(70)}`)).not.toThrow();
  });
});
