import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './jwt-auth.guard.js';
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = await this.prisma.users.findUnique({
      where: { user_id: req.user.user_id },
      select: { role: true },
    });
    if (user?.role !== 'admin')
      throw new ForbiddenException(
        'Chỉ quản trị viên được truy cập trang admin.',
      );
    return true;
  }
}
