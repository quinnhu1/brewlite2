import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

export interface RateLimitOptions {
  /** Maximum number of requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'rate-limit';

/** Applies a fixed-window limit to the decorated route. */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Process-local rate limiter for the credential endpoints.
 *
 * It is deliberately dependency free: the API runs as a single container in
 * production, and the durable brute-force protection lives in the users table
 * (`failed_login_count`, `locked_until`). If the API is ever scaled out, the
 * counters below only protect each process.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    // Global override for tests and emergency operations; per-route metadata
    // stays the production default.
    const configured = Number(process.env.AUTH_RATE_LIMIT_MAX);
    const limit =
      Number.isInteger(configured) && configured > 0 ? configured : options.limit;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const key = `${context.getClass().name}.${context.getHandler().name}:${ip}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      if (this.buckets.size > 10_000) this.prune(now);
      return true;
    }

    if (bucket.count >= limit) {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))),
      );
      throw new HttpException(
        'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        429,
      );
    }

    bucket.count += 1;
    return true;
  }

  private prune(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
