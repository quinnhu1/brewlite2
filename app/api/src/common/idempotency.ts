import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export function requireIdempotencyKey(value?: string): string {
  if (!value || !/^[A-Za-z0-9_.:-]{8,200}$/.test(value)) {
    throw new BadRequestException(
      'Idempotency-Key cần 8–200 ký tự chữ, số, _, ., :, hoặc -.',
    );
  }
  return value;
}

/** Database lock also works across several API processes, unlike an in-memory mutex. */
export async function lockKey(tx: Prisma.TransactionClient, key: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

export async function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT order_id FROM orders WHERE order_id = ${orderId}::uuid FOR UPDATE`;
}

export function fingerprint(value: unknown): string {
  function sorted(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(sorted);
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, sorted(v)]),
      );
    }
    return input;
  }
  return createHash('sha256')
    .update(JSON.stringify(sorted(value)))
    .digest('hex');
}
