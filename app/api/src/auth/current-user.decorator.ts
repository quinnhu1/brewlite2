import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './jwt-auth.guard.js';

// Dùng trong controller: @CurrentUser() user  ->  user.user_id
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
