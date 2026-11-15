import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';

// Thông tin người dùng lấy từ token, gắn vào request cho controller dùng.
export interface AuthUser {
  user_id: string; // UUID, cùng tên với cột trong DB
  auth_version: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Header có dạng: Authorization: Bearer <token>
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token đăng nhập');
    }

    try {
      // Kiểm tra chữ ký và hạn của token. Sai hoặc hết hạn thì ném lỗi.
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      if (!isUUID(payload.user_id) || !Number.isSafeInteger(payload.auth_version))
        throw new Error('Missing session identity');
      const user = await this.db.users.findUnique({
        where: { user_id: payload.user_id }, select: { auth_version: true },
      });
      if (!user || user.auth_version !== payload.auth_version)
        throw new Error('Revoked session');
      (req as Request & { user: AuthUser }).user = {
        user_id: payload.user_id, auth_version: payload.auth_version,
      };
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return true; // cho request đi tiếp
  }
}
