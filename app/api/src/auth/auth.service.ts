import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { lockKey } from '../common/idempotency.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { assertBcryptLength } from './password.js';

const PROFILE_SELECT = {
  user_id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  point: true,
} as const;

const AUTH_SELECT = {
  ...PROFILE_SELECT,
  password: true,
  token_version: true,
  failed_login_count: true,
  locked_until: true,
} as const;

const INVALID_CREDENTIALS =
  'Email/số điện thoại hoặc mật khẩu không đúng.';

/**
 * A real bcrypt hash with the same cost as production hashes. When the account
 * does not exist we still compare against it so both branches spend the same
 * amount of CPU and cannot be told apart by response time.
 */
const DUMMY_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

function positiveInt(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function maxFailedAttempts() {
  return positiveInt(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5);
}

function lockDurationMs() {
  return positiveInt(process.env.AUTH_LOCK_MINUTES, 15) * 60_000;
}

function bcryptRounds() {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  return Number.isInteger(rounds) && rounds >= 10 && rounds <= 12 ? rounds : 10;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    assertBcryptLength(dto.password);
    const password = await hash(dto.password, bcryptRounds());

    return this.prisma.$transaction(async (tx) => {
      // The database enforces unique lower(email) and unique phone, but the
      // advisory lock still gives concurrent signups a friendly 409 instead of
      // an opaque constraint error.
      await lockKey(tx, `auth:register:${email}`);

      const existing = await tx.users.findFirst({
        where: {
          OR: [
            { email: { equals: email, mode: 'insensitive' } },
            { phone },
          ],
        },
        select: { email: true, phone: true },
      });
      if (existing) {
        throw new ConflictException(
          existing.phone === phone
            ? 'Số điện thoại đã được sử dụng.'
            : 'Email đã được sử dụng.',
        );
      }

      try {
        const user = await tx.users.create({
          data: {
            name: dto.name.trim(),
            phone,
            email,
            password,
            role: 'customer',
          },
          select: { ...PROFILE_SELECT, token_version: true },
        });
        const { token_version, ...profile } = user;
        return {
          accessToken: await this.sign(user.user_id, token_version),
          user: profile,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Số điện thoại hoặc email đã được sử dụng.',
          );
        }
        throw error;
      }
    });
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier },
        ],
      },
      select: AUTH_SELECT,
    });

    if (!user) {
      await compare(dto.password, DUMMY_HASH);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      // Spend the comparison anyway so a locked account looks like any other
      // failed attempt instead of answering instantly.
      await compare(dto.password, user.password);
      throw new HttpException(
        'Tài khoản tạm thời bị khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau.',
        429,
      );
    }

    if (!(await compare(dto.password, user.password))) {
      await this.recordFailedLogin(user.user_id);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.failed_login_count > 0 || user.locked_until) {
      await this.prisma.users
        .update({
          where: { user_id: user.user_id },
          data: { failed_login_count: 0, locked_until: null },
        })
        .catch(() => undefined);
    }

    const {
      password: _password,
      token_version,
      failed_login_count: _failed,
      locked_until: _locked,
      ...profile
    } = user;
    return {
      accessToken: await this.sign(user.user_id, token_version),
      user: profile,
    };
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Prisma.usersUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();

    if (Object.keys(data).length === 0) return this.profileOrFail(userId);

    return this.prisma.users
      .update({
        where: { user_id: userId },
        data,
        select: PROFILE_SELECT,
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException('Số điện thoại đã được sử dụng.');
          }
          if (error.code === 'P2025') {
            throw new UnauthorizedException('Tài khoản không tồn tại.');
          }
        }
        throw error;
      });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    assertBcryptLength(dto.newPassword);

    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: AUTH_SELECT,
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');

    if (!(await compare(dto.currentPassword, user.password))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
    }
    if (await compare(dto.newPassword, user.password)) {
      throw new BadRequestException(
        'Mật khẩu mới phải khác mật khẩu hiện tại.',
      );
    }

    const password = await hash(dto.newPassword, bcryptRounds());
    const updated = await this.prisma.users.update({
      where: { user_id: userId },
      data: {
        password,
        // Revoke every token issued before this change, including the caller's.
        token_version: { increment: 1 },
        failed_login_count: 0,
        locked_until: null,
      },
      select: { ...PROFILE_SELECT, token_version: true },
    });

    const { token_version, ...profile } = updated;
    return {
      accessToken: await this.sign(userId, token_version),
      user: profile,
    };
  }

  private async profileOrFail(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');
    return user;
  }

  private async recordFailedLogin(userId: string) {
    try {
      const updated = await this.prisma.users.update({
        where: { user_id: userId },
        data: { failed_login_count: { increment: 1 } },
        select: { failed_login_count: true },
      });
      if (updated.failed_login_count >= maxFailedAttempts()) {
        await this.prisma.users.update({
          where: { user_id: userId },
          data: {
            failed_login_count: 0,
            locked_until: new Date(Date.now() + lockDurationMs()),
          },
        });
      }
    } catch {
      // A deleted account must not turn a failed login into a 500.
    }
  }

  private sign(userId: string, tokenVersion: number) {
    return this.jwt.signAsync({ sub: userId, ver: tokenVersion });
  }
}
