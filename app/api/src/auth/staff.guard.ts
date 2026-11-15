import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './jwt-auth.guard.js';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    const user = await this.prisma.users.findUnique({
      where: { user_id: req.user.user_id },
    });
    if (!user || !['staff', 'admin'].includes(user.role)) {
      throw new ForbiddenException(
        'Chỉ nhân viên được cập nhật tiến độ pha chế.',
      );
    }
    return true;
  }
}
