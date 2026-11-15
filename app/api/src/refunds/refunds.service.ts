import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type refunds } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { fingerprint } from '../common/idempotency.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Providers whose money movement is simulated inside BrewLite, so a refund can complete atomically. */
export const INTERNAL_REFUND_PROVIDERS = ['mock', 'free', 'demo'] as const;

export type RefundReason = 'CUSTOMER_CANCEL';

export interface MockRefundInput {
  order_id: string;
  payment: {
    payment_id: string;
    amount: Prisma.Decimal;
    provider: string;
  };
  requested_by: string;
  reason: RefundReason;
}

/**
 * Refund receipts (chứng từ hoàn tiền).
 *
 * The service never opens its own transaction for a refund: the caller (OrdersService.cancel) passes the
 * TransactionClient that already holds the order row lock, so the receipt, the payment status, the stock
 * restore and the loyalty ADJUST commit or roll back together. This also keeps OrdersModule and
 * PaymentsModule free of a circular import.
 */
@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create (or replay) the single full refund of an internally simulated payment.
   * Call only inside a transaction that already executed lockOrder(order_id).
   *
   * - Retrying the same cancel returns the same receipt (same idempotency key and fingerprint).
   * - A different request for the same payment (other amount/reason) is a 409, never a second refund.
   */
  async refundInternalPayment(
    tx: Prisma.TransactionClient,
    input: MockRefundInput,
  ): Promise<refunds> {
    const provider = input.payment.provider;
    if (!(INTERNAL_REFUND_PROVIDERS as readonly string[]).includes(provider))
      throw new ConflictException(
        'Chỉ hoàn tự động được giao dịch mock/free. Giao dịch cổng thật cần quy trình hoàn tiền riêng.',
      );
    const amount = new Prisma.Decimal(input.payment.amount);
    if (amount.isNegative())
      throw new ConflictException('Số tiền hoàn không hợp lệ.');

    const requestHash = fingerprint({
      payment_id: input.payment.payment_id,
      order_id: input.order_id,
      amount: amount.toFixed(0),
      reason: input.reason,
    });
    const existing = await tx.refunds.findUnique({
      where: { payment_id: input.payment.payment_id },
    });
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new ConflictException(
          'Giao dịch này đã có yêu cầu hoàn tiền với nội dung khác.',
        );
      return existing;
    }

    const now = new Date();
    return tx.refunds.create({
      data: {
        payment_id: input.payment.payment_id,
        order_id: input.order_id,
        idempotency_key: `refund:${input.payment.payment_id}`,
        request_hash: requestHash,
        amount,
        // Internal providers have no bank to wait for: the receipt is final in the same transaction.
        status: 'succeeded',
        provider,
        reason: input.reason,
        requested_by: input.requested_by,
        requested_at: now,
        completed_at: now,
        provider_ref: `${provider.toUpperCase()}-RF-${randomUUID().replaceAll('-', '').slice(0, 20)}`,
      },
    });
  }

  /** Receipt of an order owned by the user. Other users get 404, never another customer's refund. */
  async receiptForUser(userId: string, orderId: string) {
    const refund = await this.prisma.refunds.findFirst({
      where: { order_id: orderId, orders: { user_id: userId } },
      orderBy: { requested_at: 'desc' },
    });
    if (!refund) throw new NotFoundException('Đơn hàng không có chứng từ hoàn tiền.');
    return RefundsService.toCustomerReceipt(refund);
  }

  /** Receipt for staff/admin views, including who requested it. */
  async receiptForAdmin(orderId: string) {
    const refund = await this.prisma.refunds.findFirst({
      where: { order_id: orderId },
      orderBy: { requested_at: 'desc' },
    });
    if (!refund) throw new NotFoundException('Đơn hàng không có chứng từ hoàn tiền.');
    return { ...RefundsService.toCustomerReceipt(refund), requested_by: refund.requested_by };
  }

  /** Public shape: never exposes request_hash, idempotency_key or gateway payloads. */
  static toCustomerReceipt(refund: refunds) {
    return {
      refund_id: refund.refund_id,
      order_id: refund.order_id,
      payment_id: refund.payment_id,
      amount: Number(refund.amount),
      status: refund.status,
      provider: refund.provider,
      reason: refund.reason,
      provider_ref: refund.provider_ref,
      requested_at: refund.requested_at.toISOString(),
      completed_at: refund.completed_at?.toISOString() ?? null,
    };
  }
}
