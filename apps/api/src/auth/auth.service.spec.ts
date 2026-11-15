import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(async (value: string, encoded: string) => encoded === `hashed:${value}`),
}));

const userId = '11111111-1111-4111-8111-111111111111';
const registerDto = {
  name: '  Người dùng  ',
  email: 'User@Example.com',
  phone: '0901234567',
  password: 'secret123',
};
const profile = {
  user_id: userId,
  email: 'user@example.com',
  name: 'Người dùng',
  phone: '0901234567',
  point: 0,
  role: 'customer',
};

function createHarness() {
  const txUsers = {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: jest.fn().mockResolvedValue(profile),
  };
  const tx = { users: txUsers };
  const prisma = {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
  );
  return { service, prisma, txUsers, jwt };
}

describe('AuthService register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hashes the password and returns the fixed public profile without issuing a token', async () => {
    const { service, prisma, jwt } = createHarness();
    prisma.users.findFirst.mockResolvedValue(null);
    prisma.users.create.mockResolvedValue(profile);

    const result = await service.register(registerDto);

    expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    expect(prisma.users.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: 'hashed:secret123' }),
      select: expect.not.objectContaining({ password: true }),
    }));
    expect(result).toEqual(profile);
    expect(result).not.toHaveProperty('accessToken');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an existing email before attempting a hash', async () => {
    const { service, prisma } = createHarness();
    prisma.users.findFirst.mockResolvedValue({ user_id: userId });

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race to HTTP 409', async () => {
    const { service, prisma } = createHarness();
    prisma.users.findFirst.mockResolvedValue(null);
    prisma.users.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002', clientVersion: 'test',
    }));

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects multi-byte passwords over 72 bytes before hashing', async () => {
    const { service, prisma } = createHarness();
    const tooLong = `a1${'ế'.repeat(24)}`;

    await expect(service.register({ ...registerDto, password: tooLong })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.users.findFirst).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});

describe('AuthService login compatibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not apply the new registration password-strength rule to legacy login', async () => {
    const { service, prisma, jwt } = createHarness();
    prisma.users.findFirst.mockResolvedValue({
      ...profile,
      password: 'hashed:abc',
      auth_version: 7,
    });

    const result = await service.login({ identifier: profile.email, password: 'abc' });

    expect(result.accessToken).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalledWith({ user_id: userId, auth_version: 7 });
  });
});

describe('AuthService password update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checks the current auth_version, hashes the new password and increments auth_version in the transaction', async () => {
    const { service, prisma, txUsers } = createHarness();
    prisma.users.findUnique.mockResolvedValue({
      user_id: userId,
      auth_version: 4,
      password: 'hashed:Current123',
    });

    const result = await service.updateProfile(userId, 4, {
      current_password: 'Current123',
      password: 'NewPassword456',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('Current123', 'hashed:Current123');
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456', 10);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txUsers.updateMany).toHaveBeenCalledWith({
      where: { user_id: userId, auth_version: 4 },
      data: {
        password: 'hashed:NewPassword456',
        auth_version: { increment: 1 },
      },
    });
    expect(result).toEqual(profile);
  });

  it('rejects a stale auth_version before hashing', async () => {
    const { service, prisma } = createHarness();
    prisma.users.findUnique.mockResolvedValue({
      user_id: userId,
      auth_version: 5,
      password: 'hashed:Current123',
    });

    await expect(service.updateProfile(userId, 4, {
      current_password: 'Current123',
      password: 'NewPassword456',
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects a new password exceeding 72 UTF-8 bytes', async () => {
    const { service, prisma } = createHarness();

    await expect(service.updateProfile(userId, 4, {
      current_password: 'Current123',
      password: `a1${'ế'.repeat(24)}`,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });
});
