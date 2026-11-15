import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { isUUID } from 'class-validator';

// Thông tin người dùng lấy từ token, gắn vào request cho controller dùng.
export interface AuthUser {
  user_id: string; // UUID, cùng tên với cột trong DB
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Header có dạng: Authorization: Bearer <token>
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token đăng nhập');
    }

    try {
      // Kiểm tra chữ ký và hạn của token. Sai hoặc hết hạn thì ném lỗi.
      const payload = await this.jwt.verifyAsync<{ user_id: string }>(token);
      if (!isUUID(payload.user_id)) throw new Error('Missing user identity');
      (req as Request & { user: AuthUser }).user = { user_id: payload.user_id };
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return true; // cho request đi tiếp
  }
}
