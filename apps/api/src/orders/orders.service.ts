import {
  BadRequestException,
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

import { fingerprint, lockKey, lockOrder } from '../common/idempotency.js';
import { assertTransition } from './order-state.js';
import type { order_status } from '@prisma/client';
import { RefundsService } from '../refunds/refunds.service.js';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger(OrdersService.name);
  onModuleInit() {
    if (process.env.ORDER_EXPIRY_WORKER === 'false') return;
    this.timer = setInterval(() => {
      void this.expireUnpaidOrders().catch(() =>
        this.logger.error('Order expiry failed; will retry.'),
      );
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly refunds: RefundsService,
  ) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    checkoutKey?: string,
    quote = false,
  ) {
    const requestHash = fingerprint(dto);
    const now = new Date();
    const scheduledAt = dto.scheduled_at ? new Date(dto.scheduled_at) : null;

    return this.prisma.$transaction(
      async (tx) => {
        if (!quote && checkoutKey) {
          await lockKey(tx, `checkout:${checkoutKey}`);
          const previous = await tx.orders.findUnique({
            where: { checkout_key: checkoutKey },
          });
          if (previous) {
            if (
              previous.user_id !== userId ||
              previous.request_hash !== requestHash
            ) {
              throw new ConflictException(
                'Idempotency-Key đã được dùng cho nội dung khác.',
              );
            }
            return this.summary(previous);
          }
        }
        if (scheduledAt && scheduledAt.getTime() <= now.getTime()) {
          throw new BadRequestException(
            'Thời gian nhận dự kiến phải ở tương lai.',
          );
        }
        if (dto.pickup_method === 'DELIVERY' && !dto.delivery_address?.trim()) {
          throw new BadRequestException(
            'Vui lòng nhập địa chỉ giao hàng khi chọn DELIVERY.',
          );
        }
        const user = await tx.users.findUnique({
          where: { user_id: userId },
          select: { user_id: true },
        });
        if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');

        if (dto.replacement_of_order_id) {
          const old = await tx.orders.findFirst({
            where: { order_id: dto.replacement_of_order_id, user_id: userId },
            include: { payments: true, refunds: true },
          });
          if (!old) throw new NotFoundException('Không tìm thấy đơn gốc.');
          if (
            old.status !== 'cancelled' ||
            old.payments.some((p) =>
              ['pending', 'success'].includes(p.status),
            ) ||
            old.refunds.some((r) => r.status !== 'succeeded')
          )
            throw new ConflictException(
              'Đơn gốc phải được hủy và hoàn xong trước khi đặt đơn thay thế.',
            );
        }

        const requestedQuantityByProduct = new Map<string, number>();
        for (const item of dto.items) {
          requestedQuantityByProduct.set(
            item.product_id,
            (requestedQuantityByProduct.get(item.product_id) ?? 0) +
              item.quantity,
          );
        }

        const orderItems: Array<{
          product_id: string;
          product_name: string;
          size: string;
          unit_price: Prisma.Decimal;
          quantity: number;
          line_total: Prisma.Decimal;
          note: string | null;
          toppings: Array<{
            topping_id: string;
            topping_name: string;
            price: Prisma.Decimal;
          }>;
        }> = [];

        let subtotal = 0;
        const versions = new Map<string, number>();

        for (const item of dto.items) {
          const product = await tx.product.findFirst({
            where: { productId: item.product_id, isActive: true },
            include: {
              product_size: true,
              product_toppings: {
                where: { toppings: { is_active: true } },
                include: { toppings: true },
              },
            },
          });

          if (!product) {
            throw new NotFoundException(
              `Không tìm thấy sản phẩm ${item.product_id} hoặc sản phẩm đã ngừng bán.`,
            );
          }
          versions.set(product.productId, product.version);
          const requestedForThisProduct =
            requestedQuantityByProduct.get(item.product_id) ?? item.quantity;
          if (requestedForThisProduct > product.stock) {
            throw new BadRequestException(
              `Sản phẩm "${product.productName}" chỉ còn ${product.stock} phần trong kho, nhưng giỏ đang yêu cầu ${requestedForThisProduct} phần.`,
            );
          }

          const size = product.product_size.find(
            (candidate) => candidate.size === item.size,
          );
          if (!size) {
            throw new BadRequestException(
              `Sản phẩm "${product.productName}" không hỗ trợ size ${item.size}.`,
            );
          }

          const requestedToppingIds = item.topping_ids ?? [];
          const availableToppings = product.product_toppings
            .map((row) => row.toppings)
            .filter((topping) =>
              requestedToppingIds.includes(topping.topping_id),
            );

          if (availableToppings.length !== requestedToppingIds.length) {
            throw new BadRequestException(
              `Một hoặc nhiều topping không hợp lệ hoặc không được phép dùng với "${product.productName}".`,
            );
          }

          const baseAndSizePrice =
            Number(product.basePrice) + Number(size.add_price);
          const toppingPrice = availableToppings.reduce(
            (sum, topping) => sum + Number(topping.price),
            0,
          );
          const lineTotal = (baseAndSizePrice + toppingPrice) * item.quantity;
          subtotal += lineTotal;

          orderItems.push({
            product_id: product.productId,
            product_name: product.productName,
            size: item.size,
            unit_price: new Prisma.Decimal(baseAndSizePrice),
            quantity: item.quantity,
            line_total: new Prisma.Decimal(lineTotal),
            note: item.note?.trim() || null,
            toppings: availableToppings.map((topping) => ({
              topping_id: topping.topping_id,
              topping_name: topping.topping_name,
              price: new Prisma.Decimal(topping.price),
            })),
          });
        }

        let promotionId: string | null = null;
        let discount = 0;
        if (dto.promotion_code?.trim()) {
          const code = dto.promotion_code.trim().toUpperCase();
          const promotion = await tx.promotions.findUnique({ where: { code } });
          if (
            !promotion ||
            !promotion.is_active ||
            promotion.start_at > now ||
            promotion.end_at < now
          ) {
            throw new BadRequestException(
              'Mã giảm giá không tồn tại, chưa bắt đầu hoặc đã hết hạn.',
            );
          }
          if (subtotal < Number(promotion.min_amount)) {
            throw new BadRequestException(
              `Đơn hàng cần tối thiểu ${Number(promotion.min_amount).toLocaleString('vi-VN')}đ để áp dụng mã ${promotion.code}.`,
            );
          }

          if (
            Number(promotion.discount_value) < 0 ||
            (promotion.discount_type === 'percentage' &&
              Number(promotion.discount_value) > 100)
          )
            throw new BadRequestException('Mã giảm giá đang cấu hình sai.');
          promotionId = promotion.promotion_id;
          if (promotion.discount_type === 'percentage') {
            discount = Math.round(
              (subtotal * Number(promotion.discount_value)) / 100,
            );
            if (promotion.max_discount !== null) {
              discount = Math.min(discount, Number(promotion.max_discount));
            }
          } else {
            discount = Number(promotion.discount_value);
            if (promotion.max_discount !== null) {
              discount = Math.min(discount, Number(promotion.max_discount));
            }
          }
          discount = Math.max(0, Math.min(discount, subtotal));
        }

        const total = subtotal - discount;
        if (
          !Number.isSafeInteger(subtotal) ||
          !Number.isSafeInteger(discount) ||
          subtotal > 9999999999
        ) {
          throw new BadRequestException(
            'Giá trong danh mục không hợp lệ hoặc đơn vượt giới hạn số tiền.',
          );
        }
        if (quote)
          return {
            subtotal,
            discount,
            total,
            status: 'QUOTE',
            loyalty_earned: Math.floor(total / 10000),
          };
        // Lock products in a stable order. The version predicate rejects a stale snapshot.
        for (const [productId, quantity] of [
          ...requestedQuantityByProduct,
        ].sort(([a], [b]) => a.localeCompare(b))) {
          const updated = await tx.product.updateMany({
            where: {
              productId,
              isActive: true,
              stock: { gte: quantity },
              version: versions.get(productId),
            },
            data: { stock: { decrement: quantity }, version: { increment: 1 } },
          });
          if (updated.count !== 1)
            throw new ConflictException(
              'Tồn kho vừa thay đổi. Hãy tải lại giỏ hàng.',
            );
        }
        const datePart = new Date(now.getTime() + 7 * 3600000)
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');
        const orderCode = `BL-${datePart}-${randomBytes(5).toString('hex').toUpperCase()}`;

        const order = await tx.orders.create({
          data: {
            order_code: orderCode,
            user_id: user.user_id,
            checkout_key: checkoutKey,
            replacement_of_order_id: dto.replacement_of_order_id,
            request_hash: requestHash,
            stock_reserved: true,
            expires_at: new Date(now.getTime() + 20 * 60 * 1000),
            promotion_id: promotionId,
            status: 'pending',
            subtotal: new Prisma.Decimal(subtotal),
            discount: new Prisma.Decimal(discount),
            total: new Prisma.Decimal(total),
            pickup_method: dto.pickup_method ?? 'AT_COUNTER',
            customer_name: dto.customer_name.trim(),
            customer_phone: dto.customer_phone.trim(),
            delivery_address: dto.delivery_address?.trim() || null,
            order_note: dto.order_note?.trim() || null,
            scheduled_at: scheduledAt,
            order_items: {
              create: orderItems.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                size: item.size,
                unit_price: item.unit_price,
                quantity: item.quantity,
                line_total: item.line_total,
                note: item.note,
                order_item_toppings: {
                  create: item.toppings.map((topping) => ({
                    topping_id: topping.topping_id,
                    topping_name: topping.topping_name,
                    price: topping.price,
                  })),
                },
              })),
            },
          },
        });

        return this.summary(order);
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  private summary(order: {
    order_id: string;
    order_code: string;
    status: string;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    created: Date;
    expires_at: Date | null;
  }) {
    return {
      order_id: order.order_id,
      order_code: order.order_code,
      status: order.status.toUpperCase(),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      created_at: order.created.toISOString(),
      expires_at: order.expires_at?.toISOString() ?? null,
    };
  }

  async findMine(userId: string, page = 1) {
    const take = 20;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.orders.findMany({
        where: { user_id: userId },
        orderBy: [{ created: 'desc' }, { order_id: 'desc' }],
        skip: (page - 1) * take,
        take,
        include: {
          order_items: {
            include: {
              order_item_toppings: true,
              products: { select: { imageUrl: true } },
            },
          },
          payments: { orderBy: { created_at: 'desc' } },
          refunds: true,
        },
      }),
      this.prisma.orders.count({ where: { user_id: userId } }),
    ]);
    return {
      items: rows.map((row) => this.detail(row)),
      page,
      page_size: take,
      total,
    };
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.orders.findFirst({
      where: { order_id: id, user_id: userId },
      include: {
        order_items: {
          include: {
            order_item_toppings: true,
            products: { select: { imageUrl: true } },
          },
        },
        payments: { orderBy: { created_at: 'desc' } },
        refunds: true,
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return this.detail(row);
  }

  private detail(
    row: Prisma.ordersGetPayload<{
      include: {
        order_items: {
          include: {
            order_item_toppings: true;
            products: { select: { imageUrl: true } };
          };
        };
        payments: true;
        refunds: true;
      };
    }>,
  ) {
    const last = row.payments[0];
    const pending = row.payments.some((p) => p.status === 'pending');
    const cancelling =
      row.cancellation_requested_at !== null && row.status !== 'cancelled';
    const payable =
      ['pending', 'payment_failed'].includes(row.status) &&
      row.stock_reserved &&
      !!row.expires_at &&
      row.expires_at > new Date();
    const actions = {
      can_cancel:
        !cancelling &&
        ['pending', 'payment_failed', 'paid'].includes(row.status),
      can_retry_payment: !cancelling && payable && !pending,
      // Pending VNPay changes reuse the same reference through /payments/:id/gateway.
      can_change_method: !cancelling && payable && (!pending || last?.provider === 'vnpay'),
      can_resume_payment:
        !cancelling &&
        pending &&
        !!last?.expires_at &&
        last.expires_at > new Date(),
      can_reconcile: pending && last?.provider === 'vnpay',
      can_replace:
        row.status === 'cancelled' &&
        !row.payments.some((p) => ['success', 'pending'].includes(p.status)) &&
        row.refunds.every((r) => r.status === 'succeeded'),
      can_prepare: row.status === 'paid' && !cancelling,
    };
    const paymentView = (p: typeof last) => ({
      payment_id: p.payment_id,
      status: p.status,
      provider: p.provider,
      method: p.method,
      bank_code: p.bank_code,
      idempotency_key: p.idempotency_key,
      amount: Number(p.amount),
      transaction_id: p.transaction_id,
      paid_at: p.paid_at,
      created_at: p.created_at,
      response_code: p.response_code,
      payment_url:
        p.status === 'pending' &&
        p.expires_at &&
        p.expires_at > new Date() &&
        !cancelling
          ? p.payment_url
          : null,
      next_check_at: p.next_check_at,
      review_required: p.review_required,
      reconciliation_note: p.reconciliation_note,
    });
    return {
      ...this.summary(row),
      actions,
      cancellation_requested_at: row.cancellation_requested_at,
      cancellation_reason: row.cancellation_reason,
      replacement_of_order_id: row.replacement_of_order_id,
      payment_attempts: row.payments.map(paymentView),
      refunds: row.refunds.map((r) => ({ ...r, amount: Number(r.amount) })),
      message: cancelling
        ? 'Đã ghi nhận yêu cầu hủy. Đang xác minh thanh toán hoặc hoàn tiền; đơn chưa được pha chế.'
        : pending
          ? 'Đang chờ VNPay xác nhận; hệ thống tiếp tục đối soát khi bạn đóng trang.'
          : null,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      order_note: row.order_note,
      pickup_method: row.pickup_method,
      delivery_address: row.delivery_address,
      scheduled_at: row.scheduled_at,
      items: row.order_items.map((item) => ({
        orderitem_id: item.orderitem_id,
        product_id: item.product_id,
        product_name: item.product_name,
        image_url: item.products.imageUrl,
        size: item.size,
        quantity: item.quantity,
        note: item.note,
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total),
        toppings: item.order_item_toppings.map((t) => ({
          topping_id: t.topping_id,
          topping_name: t.topping_name,
          price: Number(t.price),
        })),
      })),
      payment: last ? paymentView(last) : null,
    };
  }

  async cancel(userId: string, id: string, reason = 'Khách yêu cầu hủy đơn') {
    await this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.orders.findFirst({
        where: { order_id: id, user_id: userId },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      await this.refunds.request(tx, order, reason);
    });
    return this.findOne(userId, id);
  }

  async advance(id: string, status: order_status) {
    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.orders.findUnique({ where: { order_id: id } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.cancellation_requested_at)
        throw new ConflictException(
          'Đơn đang yêu cầu hủy/hoàn tiền; không được bắt đầu pha chế.',
        );
      assertTransition(order.status, status);
      return this.summary(
        await tx.orders.update({ where: { order_id: id }, data: { status } }),
      );
    });
  }

  async expireUnpaidOrders() {
    const candidates = await this.prisma.orders.findMany({
      where: {
        stock_reserved: true,
        status: { in: ['pending', 'payment_failed'] },
        expires_at: { lte: new Date() },
        payments: { none: { status: 'pending' } },
      },
      select: { order_id: true },
      take: 100,
    });
    for (const { order_id } of candidates) {
      await this.prisma.$transaction(async (tx) => {
        await lockOrder(tx, order_id);
        const row = await tx.orders.findUnique({
          where: { order_id },
          include: { payments: true },
        });
        if (
          !row ||
          !row.stock_reserved ||
          !['pending', 'payment_failed'].includes(row.status) ||
          !row.expires_at ||
          row.expires_at > new Date()
        )
          return;
        // Unknown gateway outcome must be reconciled before releasing a reservation.
        if (row.payments.some((p) => p.status === 'pending')) return;
        await this.refunds.releaseStock(tx, order_id);
        await tx.orders.update({
          where: { order_id },
          data: { status: 'cancelled' },
        });
      });
    }
  }
}
