import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './DTO/login.dto.js';
import { RegisterDto } from './DTO/register.dto.js';
import { UpdateProfileDto } from './DTO/update-profile.dto.js';

const validRegister = {
  name: '  Người dùng  ',
  email: ' User@Example.COM ',
  phone: '0901234567',
  password: 'secret123',
};

async function validationErrors<T extends object>(type: new () => T, input: Record<string, unknown>) {
  return validate(plainToInstance(type, input));
}

describe('RegisterDto', () => {
  it('normalises name, email and phone while preserving the fixed email rules', async () => {
    const dto = plainToInstance(RegisterDto, validRegister);
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Người dùng');
    expect(dto.email).toBe('user@example.com');
    expect(dto.phone).toBe('0901234567');
  });

  it('accepts a password with at least eight characters, letters and digits', async () => {
    await expect(validationErrors(RegisterDto, validRegister)).resolves.toHaveLength(0);
  });

  it.each(['onlyletters', '12345678', 'abc1234'])('rejects a weak password: %s', async (password) => {
    const errors = await validationErrors(RegisterDto, { ...validRegister, password });
    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('rejects malformed phone numbers and blank names', async () => {
    const phoneErrors = await validationErrors(RegisterDto, { ...validRegister, phone: '901234567' });
    const nameErrors = await validationErrors(RegisterDto, { ...validRegister, name: '   ' });
    expect(phoneErrors.map((error) => error.property)).toContain('phone');
    expect(nameErrors.map((error) => error.property)).toContain('name');
  });
});

describe('UpdateProfileDto', () => {
  it('applies the same strong rule only to the new password', async () => {
    const valid = await validationErrors(UpdateProfileDto, {
      password: 'newPassword456',
      current_password: 'legacy-current-password',
    });
    const weak = await validationErrors(UpdateProfileDto, {
      password: 'onlyletters',
      current_password: 'legacy-current-password',
    });
    expect(valid).toHaveLength(0);
    expect(weak.map((error) => error.property)).toContain('password');
  });

  it('requires current_password when a new password is supplied', async () => {
    const errors = await validationErrors(UpdateProfileDto, { password: 'newPassword456' });
    expect(errors.map((error) => error.property)).toContain('current_password');
  });

  it('continues to allow ordinary profile updates without password fields', async () => {
    await expect(validationErrors(UpdateProfileDto, { name: 'Tên mới' })).resolves.toHaveLength(0);
  });
});

describe('LoginDto', () => {
  it('accepts a short legacy password so existing accounts can still receive the normal login response', async () => {
    const dto = plainToInstance(LoginDto, {
      identifier: ' 0901234567 ',
      password: 'abc',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.identifier).toBe('0901234567');
  });
});
