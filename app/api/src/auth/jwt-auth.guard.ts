import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
<<<<<<< HEAD
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
=======
import { isUUID } from 'class-validator';
>>>>>>> 578391e (cập nhật forder ath)

// Thông tin người dùng lấy từ token, gắn vào request cho controller dùng.
export interface AuthUser {
  user_id: string; // UUID, cùng tên với cột trong DB
}

<<<<<<< HEAD
export type AuthenticatedRequest = Request & { user?: AuthUser };

interface TokenPayload {
  sub?: string;
  /** Mirrors users.token_version so password changes revoke old tokens. */
  ver?: number;
}

/**
 * Global guard: every route needs a valid bearer token unless it is marked
 * with `@Public()`. Role checks live in AdminGuard/StaffGuard.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';
=======
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
>>>>>>> 578391e (cập nhật forder ath)

    // Header có dạng: Authorization: Bearer <token>
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token đăng nhập');
    }

<<<<<<< HEAD
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        algorithms: ['HS256'],
      });
=======
    try {
      // Kiểm tra chữ ký và hạn của token. Sai hoặc hết hạn thì ném lỗi.
      const payload = await this.jwt.verifyAsync<{ user_id: string }>(token);
      if (!isUUID(payload.user_id)) throw new Error('Missing user identity');
      (req as Request & { user: AuthUser }).user = { user_id: payload.user_id };
>>>>>>> 578391e (cập nhật forder ath)
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
<<<<<<< HEAD
    if (!payload?.sub || typeof payload.ver !== 'number') {
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
        token_version: true,
      },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');
    if (user.token_version !== payload.ver) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hiệu lực.');
    }

    const { token_version: _tokenVersion, ...profile } = user;
    request.user = profile;
    return true;
=======
    return true; // cho request đi tiếp
>>>>>>> 578391e (cập nhật forder ath)
  }
}
