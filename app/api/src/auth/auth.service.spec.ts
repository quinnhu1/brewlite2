import {
  BadRequestException,
  ConflictException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(
    async (value: string, hashed: string) => hashed === `hashed:${value}`,
  ),
}));

type PrismaMock = {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  users: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

const baseUser = {
  user_id: '11111111-1111-4111-8111-111111111111',
  name: 'Người dùng',
  email: 'user@example.com',
  phone: '0901234567',
  role: 'customer',
  point: 0,
  password: 'hashed:secret123',
  token_version: 0,
  failed_login_count: 0,
  locked_until: null,
};

const profileUser = {
  user_id: baseUser.user_id,
  name: baseUser.name,
  email: baseUser.email,
  phone: baseUser.phone,
  role: baseUser.role,
  point: baseUser.point,
  token_version: baseUser.token_version,
};

function createPrisma(): PrismaMock {
  const prisma: PrismaMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  prisma.$transaction.mockImplementation(
    (callback: (tx: PrismaMock) => unknown) => callback(prisma),
  );
  return prisma;
}

describe('AuthService', () => {
  let prisma: PrismaMock;
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrisma();
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    const dto = {
      name: '  Người dùng  ',
      email: ' User@Example.COM ',
      phone: '0901234567',
      password: 'secret123',
    };

    it('normalises input, hashes the password and signs a versioned token', async () => {
      prisma.users.findFirst.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue(profileUser);

      const result = await service.register(dto);

      expect(prisma.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'Người dùng',
            email: 'user@example.com',
            phone: '0901234567',
            password: 'hashed:secret123',
            role: 'customer',
          },
        }),
      );
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: baseUser.user_id,
        ver: 0,
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('token_version');
      expect(result.user).not.toHaveProperty('password');
    });

    it('rejects an existing email or phone', async () => {
      prisma.users.findFirst.mockResolvedValue({
        email: 'user@example.com',
        phone: '0901234567',
      });

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it('maps a unique-constraint race to a friendly 409', async () => {
      prisma.users.findFirst.mockResolvedValue(null);
      prisma.users.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects passwords longer than 72 bytes', async () => {
      await expect(
        service.register({ ...dto, password: 'a1'.repeat(40) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    const dto = { identifier: 'user@example.com', password: 'secret123' };

    it('returns 401 for an unknown account without revealing it', async () => {
      prisma.users.findFirst.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('counts a failed attempt and returns the generic message', async () => {
      prisma.users.findFirst.mockResolvedValue({ ...baseUser });
      prisma.users.update.mockResolvedValue({ failed_login_count: 1 });

      await expect(
        service.login({ ...dto, password: 'wrong-password' }),
      ).rejects.toMatchObject({
        message: 'Email/số điện thoại hoặc mật khẩu không đúng.',
      });
      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { failed_login_count: { increment: 1 } },
        }),
      );
    });

    it('locks the account once the failure threshold is reached', async () => {
      prisma.users.findFirst.mockResolvedValue({
        ...baseUser,
        failed_login_count: 4,
      });
      prisma.users.update
        .mockResolvedValueOnce({ failed_login_count: 5 })
        .mockResolvedValueOnce({ ...baseUser });

      await expect(
        service.login({ ...dto, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.users.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            locked_until: expect.any(Date),
          }),
        }),
      );
    });

    it('refuses a locked account with 429', async () => {
      prisma.users.findFirst.mockResolvedValue({
        ...baseUser,
        locked_until: new Date(Date.now() + 60_000),
      });

      const error = await service
        .login(dto)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    });

    it('resets the failure counters and signs with the current version', async () => {
      prisma.users.findFirst.mockResolvedValue({
        ...baseUser,
        failed_login_count: 2,
        locked_until: new Date(Date.now() - 1_000),
      });
      prisma.users.update.mockResolvedValue({ ...baseUser });

      const result = await service.login(dto);

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { failed_login_count: 0, locked_until: null },
        }),
      );
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: baseUser.user_id,
        ver: 0,
      });
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('token_version');
    });
  });

  describe('updateProfile', () => {
    it('updates only the provided fields', async () => {
      prisma.users.update.mockResolvedValue({ ...profileUser, name: 'Tên mới' });

      const user = await service.updateProfile(baseUser.user_id, {
        name: '  Tên mới ',
      });

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: baseUser.user_id },
          data: { name: 'Tên mới' },
        }),
      );
      expect(user.name).toBe('Tên mới');
    });

    it('returns the profile unchanged when no field is supplied', async () => {
      prisma.users.findUnique.mockResolvedValue({ ...baseUser });

      const user = await service.updateProfile(baseUser.user_id, {});

      expect(prisma.users.update).not.toHaveBeenCalled();
      expect(user.user_id).toBe(baseUser.user_id);
    });

    it('maps a duplicate phone to 409', async () => {
      prisma.users.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updateProfile(baseUser.user_id, { phone: '0901234567' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('changePassword', () => {
    const dto = {
      currentPassword: 'secret123',
      newPassword: 'secret456',
    };

    it('requires the current password', async () => {
      prisma.users.findUnique.mockResolvedValue({ ...baseUser });

      await expect(
        service.changePassword(baseUser.user_id, {
          ...dto,
          currentPassword: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      prisma.users.findUnique.mockResolvedValue({ ...baseUser });

      await expect(
        service.changePassword(baseUser.user_id, {
          currentPassword: 'secret123',
          newPassword: 'secret123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bumps token_version and signs a fresh token', async () => {
      prisma.users.findUnique.mockResolvedValue({ ...baseUser });
      prisma.users.update.mockResolvedValue({
        ...profileUser,
        token_version: 1,
      });

      const result = await service.changePassword(
        baseUser.user_id,
        dto,
      );

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed:secret456',
            token_version: { increment: 1 },
          }),
        }),
      );
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: baseUser.user_id,
        ver: 1,
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('token_version');
    });
  });
});
