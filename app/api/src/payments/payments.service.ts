import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Prisma, type payments } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { fingerprint, lockKey, lockOrder } from '../common/idempotency.js';
import { assertTransition } from '../orders/order-state.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import * as vnpay from './vnpay.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  getConfig() {
    const provider = process.env.PAYMENT_PROVIDER ?? 'vnpay';
    if (provider !== 'vnpay' && provider !== 'mock')
      throw new ServiceUnavailableException('PAYMENT_PROVIDER không hợp lệ.');
    if (
      provider === 'mock' &&
      process.env.NODE_ENV === 'production' &&
      process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION !== 'true'
    )
      throw new ServiceUnavailableException(
        'Demo production cần PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true để dùng mock.',
      );
    return {
      provider,
      configured: provider === 'mock' || vnpay.config() !== null,
      channels:
        provider === 'vnpay' ? ['VNPAYQR', 'VNBANK', 'INTCARD', 'GATEWAY'] : [],
      methods: provider === 'mock' ? ['momo', 'banking'] : ['vnpay'],
      allow_simulate:
        provider === 'mock' &&
        process.env.PAYMENT_MOCK_ALLOW_OVERRIDE === 'true',
    };
  }

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    key: string,
    ip: string,
  ) {
    const { provider, allow_simulate, configured } = this.getConfig();
    if (!configured)
      throw new ServiceUnavailableException(
        'Kiểm tra VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL ở backend.',
      );
    if (dto.simulate_result && !allow_simulate)
      throw new BadRequestException(
        'Chỉ được chọn kết quả khi bật chế độ thanh toán giả lập.',
      );
    if (provider === 'vnpay' && dto.method !== 'vnpay')
      throw new BadRequestException('Hãy chọn phương thức VNPay.');

    const requestHash = fingerprint({
      order_id: dto.order_id,
      method: dto.method,
      bank_code: dto.bank_code ?? null,
      provider,
      simulate_result:
        provider === 'mock' ? (dto.simulate_result ?? 'SUCCESS') : null,
    });
    return this.prisma.$transaction(
      async (tx) => {
        await lockKey(tx, `payment:${key}`);
        await lockOrder(tx, dto.order_id);
        const order = await tx.orders.findFirst({
          where: { order_id: dto.order_id, user_id: userId },
        });
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
        const effectiveProvider = Number(order.total) === 0 ? 'free' : provider;
        const previous = await tx.payments.findUnique({
          where: { idempotency_key: key },
        });
        if (previous) {
          if (
            previous.request_hash !== requestHash ||
            previous.order_id !== order.order_id ||
            previous.method !== dto.method ||
            previous.provider !== effectiveProvider ||
            previous.bank_code !== (dto.bank_code ?? null)
          )
            throw new ConflictException(
              'Idempotency-Key đã dùng cho yêu cầu khác.',
            );
          return this.toResponse(previous, order);
        }
        if (!['pending', 'payment_failed'].includes(order.status))
          throw new ConflictException(
            'Đơn không còn ở trạng thái chờ thanh toán.',
          );
        if (
          !order.stock_reserved ||
          !order.expires_at ||
          order.expires_at <= new Date()
        )
          throw new ConflictException(
            'Đơn đã hết thời gian giữ hàng. Hãy tạo đơn mới.',
          );
        const pending = await tx.payments.findFirst({
          where: { order_id: order.order_id, status: 'pending' },
        });
        if (pending) {
          // A second key may resume the same gateway session, never create another outstanding charge.
          if (
            pending.method !== dto.method ||
            pending.bank_code !== (dto.bank_code ?? null) ||
            pending.provider !== effectiveProvider
          )
            throw new ConflictException(
              'Đơn đang có một giao dịch chờ xác nhận.',
            );
          return this.toResponse(pending, order);
        }
        const now = new Date();
        const amount = Number(order.total);
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > 9999999999)
          throw new BadRequestException('Số tiền thanh toán không hợp lệ.');
        const ref = randomUUID().replaceAll('-', '');
        const url =
          effectiveProvider === 'vnpay'
            ? vnpay.createUrl({
                amount,
                ref,
                orderCode: order.order_code,
                now,
                expires: order.expires_at,
                ip,
                bankCode: dto.bank_code,
              })
            : null;
        let payment = await tx.payments.create({
          data: {
            order_id: order.order_id,
            idempotency_key: key,
            amount: order.total,
            method: dto.method,
            status: 'pending',
            provider: effectiveProvider,
            request_hash: requestHash,
            gateway_ref: effectiveProvider === 'vnpay' ? ref : null,
            payment_url: url,
            expires_at: order.expires_at,
            bank_code: dto.bank_code,
            created_at: now,
          },
        });
        if (order.status === 'payment_failed') {
          assertTransition(order.status, 'pending');
          order.status = 'pending';
          await tx.orders.update({
            where: { order_id: order.order_id },
            data: { status: 'pending' },
          });
        }
        if (effectiveProvider === 'mock' || effectiveProvider === 'free') {
          const success =
            effectiveProvider === 'free' || dto.simulate_result !== 'FAILED';
          payment = await this.finalize(
            tx,
            payment,
            order,
            success,
            `${effectiveProvider.toUpperCase()}-${randomUUID()}`,
            now,
            success ? '00' : '24',
          );
          order.status =
            payment.status === 'success' ? 'paid' : 'payment_failed';
        }
        return this.toResponse(payment, order);
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  private async finalize(
    tx: Prisma.TransactionClient,
    payment: payments,
    order: {
      order_id: string;
      order_code: string;
      user_id: string;
      status: import('@prisma/client').order_status;
      stock_reserved: boolean;
      total: Prisma.Decimal;
    },
    success: boolean,
    transactionId: string,
    paidAt: Date | null,
    code: string | null,
  ) {
    assertTransition(order.status, success ? 'paid' : 'payment_failed');
    if (success && !order.stock_reserved)
      throw new ConflictException(
        'Đơn không có tồn kho đang giữ; cần đối soát giao dịch.',
      );
    const updated = await tx.payments.update({
      where: { payment_id: payment.payment_id },
      data: {
        status: success ? 'success' : 'failed',
        transaction_id: success ? transactionId : null,
        paid_at: success ? paidAt : null,
        response_code: code,
      },
    });
    await tx.orders.update({
      where: { order_id: order.order_id },
      data: {
        status: success ? 'paid' : 'payment_failed',
        ...(success ? { stock_reserved: false } : {}),
      },
    });
    if (success) {
      const points = Math.floor(Number(order.total) / 10000);
      if (points > 0) {
        await tx.loyalty_transactions.create({
          data: {
            user_id: order.user_id,
            order_id: order.order_id,
            loyalty_point: points,
            type: 'EARN',
            description: `Tích điểm đơn ${order.order_code}`,
          },
        });
        await tx.users.update({
          where: { user_id: order.user_id },
          data: { point: { increment: points } },
        });
      }
    }
    return updated;
  }

  async ipn(query: Record<string, unknown>) {
    try {
      const params = vnpay.extractParams(query);
      if (!params || !vnpay.verify(params))
        return { RspCode: '97', Message: 'Invalid signature' };
      const found = await this.prisma.payments.findUnique({
        where: { gateway_ref: params.vnp_TxnRef ?? '' },
      });
      if (!found || found.provider !== 'vnpay')
        return { RspCode: '01', Message: 'Order not found' };
      return await this.prisma.$transaction(async (tx) => {
        await lockOrder(tx, found.order_id);
        const payment = await tx.payments.findUniqueOrThrow({
          where: { payment_id: found.payment_id },
        });
        const order = await tx.orders.findUniqueOrThrow({
          where: { order_id: payment.order_id },
        });
        if (
          !/^\d+$/.test(params.vnp_Amount ?? '') ||
          BigInt(params.vnp_Amount) !==
            BigInt(payment.amount.toFixed(0)) * 100n ||
          !payment.amount.equals(order.total)
        )
          return { RspCode: '04', Message: 'Invalid amount' };
        if (payment.status !== 'pending')
          return { RspCode: '02', Message: 'Order already confirmed' };
        const code = params.vnp_ResponseCode ?? '';
        const status = params.vnp_TransactionStatus ?? '';
        if (!/^\d{2}$/.test(code) || !/^\d{2}$/.test(status))
          return { RspCode: '99', Message: 'Invalid result' };
        const success = code === '00' && status === '00';
        const failed = status === '02' && code !== '00' && code !== '07';
        if (!success && !failed)
          return { RspCode: '99', Message: 'Pending reconciliation' };
        const date = vnpay.parsePayDate(params.vnp_PayDate);
        if (
          success &&
          ((params.vnp_PayDate && !date) ||
            !/^[0-9]{1,15}$/.test(params.vnp_TransactionNo ?? '') ||
            params.vnp_TransactionNo === '0')
        )
          return { RspCode: '99', Message: 'Invalid transaction' };
        await this.finalize(
          tx,
          payment,
          order,
          success,
          params.vnp_TransactionNo,
          date,
          code,
        );
        return { RspCode: '00', Message: 'Confirm success' };
      });
    } catch {
      this.logger.error(
        'VNPay IPN could not be persisted; gateway should retry.',
      );
      return { RspCode: '99', Message: 'Temporary error' };
    }
  }

  async byReference(userId: string, ref: string) {
    const payment = await this.prisma.payments.findFirst({
      where: { gateway_ref: ref, orders: { user_id: userId } },
      include: { orders: true },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch.');
    return this.toResponse(payment, payment.orders);
  }

  async reconcile(userId: string, id: string) {
    const payment = await this.prisma.payments.findFirst({
      where: { payment_id: id, orders: { user_id: userId } },
      include: { orders: true },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch.');
    if (
      payment.status !== 'pending' ||
      payment.provider !== 'vnpay' ||
      !payment.gateway_ref ||
      !payment.payment_url
    )
      return this.toResponse(payment, payment.orders);
    const createDate = new URL(payment.payment_url).searchParams.get(
      'vnp_CreateDate',
    );
    if (!createDate)
      throw new ConflictException('Giao dịch thiếu thời gian khởi tạo.');
    const result = await vnpay.queryTransaction(
      payment.gateway_ref,
      createDate,
    );
    if (
      result.vnp_ResponseCode !== '00' ||
      result.vnp_TransactionType !== '01' ||
      !['00', '02'].includes(result.vnp_TransactionStatus)
    )
      return {
        ...this.toResponse(payment, payment.orders),
        message: 'VNPay chưa xác nhận kết quả cuối cùng. Thử lại sau.',
      };
    if (
      !/^\d+$/.test(result.vnp_Amount ?? '') ||
      BigInt(result.vnp_Amount) !== BigInt(payment.amount.toFixed(0)) * 100n
    )
      throw new ConflictException('Số tiền đối soát không khớp.');
    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, payment.order_id);
      const current = await tx.payments.findUniqueOrThrow({
        where: { payment_id: id },
      });
      const order = await tx.orders.findUniqueOrThrow({
        where: { order_id: payment.order_id },
      });
      if (current.status !== 'pending') return this.toResponse(current, order);
      const success = result.vnp_TransactionStatus === '00';
      const paidAt = vnpay.parsePayDate(result.vnp_PayDate);
      if (
        success &&
        (!paidAt ||
          !/^[0-9]{1,15}$/.test(result.vnp_TransactionNo ?? '') ||
          result.vnp_TransactionNo === '0')
      )
        throw new ConflictException(
          'Kết quả đối soát thiếu mã/thời gian giao dịch.',
        );
      const updated = await this.finalize(
        tx,
        current,
        order,
        success,
        result.vnp_TransactionNo,
        paidAt,
        success ? '00' : null,
      );
      return this.toResponse(updated, {
        ...order,
        status: success ? 'paid' : 'payment_failed',
      });
    });
  }

  toResponse(payment: payments, order: { order_code: string; status: string }) {
    return {
      payment_id: payment.payment_id,
      order_id: payment.order_id,
      order_code: order.order_code,
      status: payment.status.toUpperCase(),
      payment_status: payment.status,
      order_status: order.status.toUpperCase(),
      provider: payment.provider,
      response_code: payment.provider === 'vnpay' ? payment.response_code : null,
      method: payment.method,
      amount: Number(payment.amount),
      transaction_id: payment.transaction_id,
      paid_at: payment.paid_at?.toISOString() ?? null,
      idempotency_key: payment.idempotency_key,
      reference: payment.gateway_ref,
      payment_url: payment.status === 'pending' ? payment.payment_url : null,
      expires_at: payment.expires_at?.toISOString() ?? null,
    };
  }
}
