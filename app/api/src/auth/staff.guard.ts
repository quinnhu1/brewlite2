import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

/** Allows `staff` and `admin`; customers are rejected with 403. */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest<AuthenticatedRequest>().user
      ?.role;
    if (role !== 'staff' && role !== 'admin') {
      throw new ForbiddenException(
        'Chỉ nhân viên hoặc quản trị viên được phép thực hiện.',
      );
    }
    return true;
  }
}
