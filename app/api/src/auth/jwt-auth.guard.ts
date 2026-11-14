import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

/** The authenticated user attached to the request by JwtAuthGuard. */
export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  point: number;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';

    if (!token) throw new UnauthorizedException('Cần đăng nhập.');

    let payload: { sub?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    }
    if (!payload?.sub) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    }

    // Read the role from the database so revoked or changed roles take effect
    // immediately instead of waiting for the token to expire.
    const user = await this.prisma.users.findUnique({
      where: { user_id: payload.sub },
      select: {
        user_id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        point: true,
      },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');

    request.user = user;
    return true;
  }
}
