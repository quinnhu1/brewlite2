import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { lockKey } from '../common/idempotency.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const PROFILE_SELECT = {
  user_id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  point: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const password = await hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // Email is not unique in the schema, so serialise signups per address to
      // keep concurrent registrations from creating duplicates.
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
          select: PROFILE_SELECT,
        });
        return { accessToken: await this.sign(user.user_id), user };
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
      select: { ...PROFILE_SELECT, password: true },
    });
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException(
        'Email/số điện thoại hoặc mật khẩu không đúng.',
      );
    }
    const { password: _password, ...profile } = user;
    return { accessToken: await this.sign(user.user_id), user: profile };
  }

  async me(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');
    return user;
  }

  private sign(userId: string) {
    return this.jwt.signAsync({ sub: userId });
  }
}
