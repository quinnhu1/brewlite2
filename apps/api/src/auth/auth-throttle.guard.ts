import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './jwt-auth.guard.js';

/** PostgreSQL buckets are shared across API processes and survive restarts. */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const action = context.getHandler().name;
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const buckets: Array<[string, number, number]> = [];
    if (action === 'login') {
      buckets.push([`login-ip:${ip}`, 60, 60]);
      if (typeof req.body?.identifier === 'string')
        buckets.push([`login-account:${req.body.identifier.trim().toLowerCase().slice(0, 100)}`, 10, 900]);
    } else if (action === 'register') {
      buckets.push([`register-ip:${ip}`, 20, 60]);
    } else if (action === 'updateProfile' && req.body?.password !== undefined) {
      buckets.push([`password:${req.user?.user_id ?? ip}`, 5, 900]);
    }
    for (const [identity, limit, seconds] of buckets) {
      const key = createHash('sha256').update(identity).digest('hex');
      const [row] = await this.db.$queryRaw<Array<{ hits: number; retry_after: number }>>`
        INSERT INTO auth_rate_limits (bucket_key, hits, expires_at)
        VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
        ON CONFLICT (bucket_key) DO UPDATE SET
          hits = CASE WHEN auth_rate_limits.expires_at <= NOW() THEN 1 ELSE auth_rate_limits.hits + 1 END,
          expires_at = CASE WHEN auth_rate_limits.expires_at <= NOW()
            THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE auth_rate_limits.expires_at END
        RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())))::int) AS retry_after
      `;
      if (row.hits > limit) {
        response.setHeader('Retry-After', row.retry_after);
        throw new HttpException('Bạn thao tác quá nhiều lần. Vui lòng đợi rồi thử lại.', 429);
      }
    }
    // Bound cleanup work; no identifiers, IPs or passwords are stored in these buckets.
    if (buckets.length) await this.db.$executeRaw`
      DELETE FROM auth_rate_limits WHERE bucket_key IN (
        SELECT bucket_key FROM auth_rate_limits
        WHERE expires_at < NOW() - INTERVAL '1 day' ORDER BY expires_at LIMIT 50
      )
    `;
    return true;
  }
}
