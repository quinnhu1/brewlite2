import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, type orders, type refunds } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { lockOrder } from '../common/idempotency.js';
import * as vnpay from '../payments/vnpay.js';

const COOLDOWN = 5 * 60_000;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  constructor(private readonly db: PrismaService) {}

  // All lifecycle mutations use the same order row lock as payment and preparation.
  async releaseStock(tx: Prisma.TransactionClient, id: string) {
    const changed = await tx.orders.updateMany({
      where: { order_id: id, stock_reserved: true },
      data: { stock_reserved: false },
    });
    if (!changed.count) return;
    const items = await tx.order_items.groupBy({
      by: ['product_id'],
      where: { order_id: id },
      _sum: { quantity: true },
    });
    for (const item of items.sort((a, b) =>
      a.product_id.localeCompare(b.product_id),
    )) {
      await tx.product.update({
        where: { productId: item.product_id },
        data: {
          stock: { increment: item._sum.quantity ?? 0 },
          version: { increment: 1 },
        },
      });
    }
  }

  async request(tx: Prisma.TransactionClient, order: orders, reason: string) {
    if (order.status === 'cancelled') return;
    if (!['pending', 'payment_failed', 'paid'].includes(order.status))
      throw new ConflictException('Chỉ hủy được đơn chưa bắt đầu pha chế.');
    if (!order.cancellation_requested_at) {
      order = await tx.orders.update({
        where: { order_id: order.order_id },
        data: {
          cancellation_requested_at: new Date(),
          cancellation_reason: reason,
        },
      });
    }
    await this.settleRequested(tx, order);
  }

  async settleRequested(tx: Prisma.TransactionClient, order: orders) {
    if (!order.cancellation_requested_at || order.status === 'cancelled')
      return;
    const payments = await tx.payments.findMany({
      where: { order_id: order.order_id },
    });
    if (payments.some((p) => p.status === 'pending')) return;
    const charged = payments.find((p) => p.status === 'success');
    if (!charged) {
      if (!['pending', 'payment_failed'].includes(order.status))
        throw new ConflictException(
          'Đơn cần kiểm tra giao dịch trước khi hủy.',
        );
      await this.releaseStock(tx, order.order_id);
      await tx.orders.update({
        where: { order_id: order.order_id },
        data: { status: 'cancelled' },
      });
      return;
    }
    if (order.status !== 'paid')
      throw new ConflictException('Đơn đã bắt đầu pha chế.');
    let refund = await tx.refunds.findUnique({
      where: { payment_id: charged.payment_id },
    });
    refund ??= await tx.refunds.create({
      data: {
        order_id: order.order_id,
        payment_id: charged.payment_id,
        request_id: randomUUID().replaceAll('-', ''),
        amount: charged.amount,
        provider: charged.provider,
        reason: order.cancellation_reason ?? 'Khách yêu cầu hủy đơn',
        requested_by: order.user_id,
        next_check_at: new Date(),
      },
    });
    if (['mock', 'free', 'demo'].includes(charged.provider)) {
      await this.complete(tx, refund, order, `MOCK-REFUND-${refund.refund_id}`);
    }
  }

  private async complete(
    tx: Prisma.TransactionClient,
    refund: refunds,
    order: orders,
    ref: string,
  ) {
    if (refund.status === 'succeeded') return;
    const payment = await tx.payments.findUniqueOrThrow({
      where: { payment_id: refund.payment_id },
    });
    if (
      order.status !== 'paid' ||
      payment.status !== 'success' ||
      !payment.amount.equals(refund.amount)
    )
      throw new ConflictException('Hoàn tiền không khớp giao dịch gốc.');
    const earned = await tx.loyalty_transactions.aggregate({
      where: { order_id: order.order_id, type: 'EARN' },
      _sum: { loyalty_point: true },
    });
    const points = earned._sum.loyalty_point ?? 0;
    if (points > 0) {
      const changed = await tx.users.updateMany({
        where: { user_id: order.user_id, point: { gte: points } },
        data: { point: { decrement: points } },
      });
      if (!changed.count)
        throw new ConflictException(
          'Điểm thưởng cần đối soát trước khi hoàn tất hủy.',
        );
      await tx.loyalty_transactions.create({
        data: {
          user_id: order.user_id,
          order_id: order.order_id,
          type: 'ADJUST',
          loyalty_point: -points,
          description: `Thu hồi điểm; chứng từ hoàn ${refund.refund_id}`,
        },
      });
    }
    await tx.refunds.update({
      where: { refund_id: refund.refund_id },
      data: {
        status: 'succeeded',
        completed_at: new Date(),
        provider_ref: ref,
        next_check_at: null,
        message:
          refund.provider === 'vnpay'
            ? 'VNPay xác nhận hoàn thành giao dịch hoàn.'
            : 'Đã hoàn mô phỏng; không chuyển tiền ngân hàng.',
      },
    });
    await tx.payments.update({
      where: { payment_id: payment.payment_id },
      data: { status: 'refunded' },
    });
    // Paid orders already consumed stock; restoring the flag is protected by the order lock and receipt.
    await tx.orders.update({
      where: { order_id: order.order_id },
      data: { stock_reserved: true },
    });
    await this.releaseStock(tx, order.order_id);
    await tx.orders.update({
      where: { order_id: order.order_id },
      data: { status: 'cancelled' },
    });
  }

  async processDue() {
    const rows = await this.db.refunds.findMany({
      where: {
        provider: 'vnpay',
        status: { in: ['requested', 'processing', 'review_required'] },
        OR: [{ next_check_at: null }, { next_check_at: { lte: new Date() } }],
      },
      select: { refund_id: true },
      orderBy: [{ next_check_at: { sort: 'asc', nulls: 'first' } }, { requested_at: 'asc' }],
      take: 10,
    });
    for (const row of rows) await this.process(row.refund_id);
  }

  async process(id: string, manual = false) {
    // Claim before network IO. A process crash after this point is an UNKNOWN outcome: query only, never resend.
    const claimed = await this.db.$transaction(async (tx) => {
      const found = await tx.refunds.findUnique({ where: { refund_id: id } });
      if (!found) return null;
      await lockOrder(tx, found.order_id);
      const refund = await tx.refunds.findUniqueOrThrow({
        where: { refund_id: id },
        include: { payments: true },
      });
      if (
        refund.status === 'succeeded' ||
        (refund.status === 'failed' && !manual) ||
        (refund.next_check_at && refund.next_check_at > new Date())
      )
        return null;
      if (process.env.VNPAY_REFUND_ENABLED !== 'true' && !refund.submitted_at) {
        await tx.refunds.update({
          where: { refund_id: id },
          data: {
            next_check_at: new Date(Date.now() + COOLDOWN),
            message:
              'Đã ghi nhận yêu cầu. Cửa hàng cần kích hoạt quyền hoàn tiền VNPay để gửi.',
          },
        });
        return null;
      }
      if (
        refund.payments.merchant_code &&
        refund.payments.merchant_code !== process.env.VNPAY_TMN_CODE?.trim()
      ) {
        await tx.refunds.update({
          where: { refund_id: id },
          data: {
            status: 'review_required',
            next_check_at: new Date(Date.now() + COOLDOWN),
            message:
              'Merchant đã thay đổi; cần đối soát với cấu hình giao dịch gốc.',
          },
        });
        return null;
      }
      const submit = !refund.submitted_at;
      const submitted = refund.submitted_at ?? new Date();
      let prepared: ReturnType<typeof vnpay.prepareRefund> | null = null;
      if (submit) {
        try {
          const p = refund.payments;
          const date = p.gateway_create_date ??
            (p.payment_url ? new URL(p.payment_url).searchParams.get('vnp_CreateDate') : null);
          prepared = vnpay.prepareRefund({
            requestId: refund.request_id,
            ref: p.gateway_ref ?? '',
            transactionNo: p.transaction_id ?? '',
            amount: Number(refund.amount),
            transactionDate: date ?? '',
            createdAt: submitted,
            createdBy: refund.requested_by,
          });
        } catch {
          // No network IO occurred, so this receipt must remain eligible for its first send.
          await tx.refunds.update({
            where: { refund_id: id },
            data: {
              status: 'review_required',
              next_check_at: new Date(Date.now() + COOLDOWN),
              message: 'Chưa gửi yêu cầu hoàn: kiểm tra cấu hình VNPay và dữ liệu giao dịch gốc. Sau khi sửa, hệ thống sẽ thử gửi lại.',
            },
          });
          return null;
        }
      }
      await tx.refunds.update({
        where: { refund_id: id },
        data: {
          status: 'processing',
          submitted_at: submitted,
          check_attempts: { increment: 1 },
          next_check_at: new Date(Date.now() + COOLDOWN),
        },
      });
      return { refund, prepared };
    });
    if (!claimed) return;
    const { refund, prepared } = claimed;
    try {
      const p = refund.payments;
      const date =
        p.gateway_create_date ??
        (p.payment_url
          ? new URL(p.payment_url).searchParams.get('vnp_CreateDate')
          : null);
      if (!p.gateway_ref || !date || !p.transaction_id)
        throw new Error('Missing original reference');
      const result = prepared
        ? await vnpay.sendPreparedRefund(prepared)
        : await vnpay.queryTransaction(p.gateway_ref, date);
      await this.db.$transaction(async (tx) => {
        await lockOrder(tx, refund.order_id);
        const current = await tx.refunds.findUniqueOrThrow({
          where: { refund_id: id },
        });
        if (current.status === 'succeeded') return;
        const isRefund = result.vnp_TransactionType === '02';
        const matches =
          /^\d+$/.test(result.vnp_Amount ?? '') &&
          BigInt(result.vnp_Amount) ===
            BigInt(current.amount.toFixed(0)) * 100n;
        const complete =
          result.vnp_ResponseCode === '00' &&
          isRefund &&
          matches &&
          result.vnp_TransactionStatus === '00' &&
          /^[1-9][0-9]{0,14}$/.test(result.vnp_TransactionNo ?? '');
        await tx.refunds.update({
          where: { refund_id: id },
          data: {
            response_code: result.vnp_ResponseCode?.slice(0, 2),
            provider_status: result.vnp_TransactionStatus?.slice(0, 2),
            status:
              isRefund && matches && result.vnp_TransactionStatus === '09'
                ? 'failed'
                : current.check_attempts >= 12
                  ? 'review_required'
                  : 'processing',
            message: complete
              ? 'VNPay xác nhận hoàn.'
              : 'Đang đối soát hoàn tiền; chưa xác nhận tiền đã hoàn. Cửa hàng xem mã giao dịch trong quản trị.',
          },
        });
        if (complete) {
          const order = await tx.orders.findUniqueOrThrow({
            where: { order_id: refund.order_id },
          });
          await this.complete(tx, current, order, result.vnp_TransactionNo);
        }
      });
    } catch {
      this.logger.warn(`Refund needs reconciliation: ${id}`);
      await this.db.refunds.updateMany({
        where: { refund_id: id, status: { not: 'succeeded' } },
        data: {
          status: 'review_required',
          message:
            'Chưa xác minh được kết quả. Hệ thống sẽ truy vấn; không gửi lệnh hoàn mới.',
        },
      });
    }
  }
}
