import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const valid = {
  name: '  Người dùng  ',
  email: ' user@example.com ',
  phone: '0901234567',
  password: 'secret123',
};

async function validateRegister(input: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, input);
  return { dto, errors: await validate(dto) };
}

describe('RegisterDto', () => {
  it('trims whitespace around name, email and phone', async () => {
    const { dto, errors } = await validateRegister(valid);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Người dùng');
    expect(dto.email).toBe('user@example.com');
    expect(dto.phone).toBe('0901234567');
  });

  it('accepts a password with letters and digits', async () => {
    const { errors } = await validateRegister(valid);
    expect(errors).toHaveLength(0);
  });

  it('rejects a password without a digit', async () => {
    const { errors } = await validateRegister({
      ...valid,
      password: 'onlyletters',
    });
    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const { errors } = await validateRegister({ ...valid, password: 'abc1' });
    expect(errors.map((error) => error.property)).toContain('password');
  });

  it('rejects a 9-digit phone number', async () => {
    const { errors } = await validateRegister({
      ...valid,
      phone: '901234567',
    });
    expect(errors.map((error) => error.property)).toContain('phone');
  });

  it('rejects a phone number that does not start with 0', async () => {
    const { errors } = await validateRegister({
      ...valid,
      phone: '1901234567',
    });
    expect(errors.map((error) => error.property)).toContain('phone');
  });

  it('rejects a whitespace-only name', async () => {
    const { errors } = await validateRegister({ ...valid, name: '   ' });
    expect(errors.map((error) => error.property)).toContain('name');
  });

  it('rejects an invalid email', async () => {
    const { errors } = await validateRegister({
      ...valid,
      email: 'not-an-email',
    });
    expect(errors.map((error) => error.property)).toContain('email');
  });
});

describe('LoginDto', () => {
  it('accepts a short legacy password so the API can answer 401', async () => {
    const dto = plainToInstance(LoginDto, {
      identifier: ' 0901234567 ',
      password: 'abc',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.identifier).toBe('0901234567');
  });
});
