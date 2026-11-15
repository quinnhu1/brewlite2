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
  constructor(private readonly prisma: PrismaService) {}

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
          payments: { orderBy: { created_at: 'desc' }, take: 1 },
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
        payments: { orderBy: { created_at: 'desc' }, take: 1 },
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
      };
    }>,
  ) {
    const last = row.payments[0];
    return {
      ...this.summary(row),
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
      payment: last
        ? {
            payment_id: last.payment_id,
            status: last.status,
            provider: last.provider,
            method: last.method,
            payment_url: last.status === 'pending' ? last.payment_url : null,
            amount: Number(last.amount),
            transaction_id: last.transaction_id,
            paid_at: last.paid_at,
          }
        : null,
    };
  }

  private async releaseStock(tx: Prisma.TransactionClient, orderId: string) {
    const reserved = await tx.orders.updateMany({
      where: { order_id: orderId, stock_reserved: true },
      data: { stock_reserved: false },
    });
    if (reserved.count === 0) return;
    const items = await tx.order_items.groupBy({
      by: ['product_id'],
      where: { order_id: orderId },
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

  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.orders.findFirst({
        where: { order_id: id, user_id: userId },
        include: { payments: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.status === 'cancelled') return this.summary(order);
      // A gateway may still be processing money. Never release stock based on a browser cancel.
      if (order.payments.some((p) => p.status === 'pending'))
        throw new ConflictException(
          'Giao dịch đang chờ VNPay xác nhận. Chưa thể hủy đơn.',
        );
      if (order.status === 'paid') {
        const charged = order.payments.find((p) => p.status === 'success');
        if (!charged || !['mock', 'free', 'demo'].includes(charged.provider))
          throw new ConflictException(
            'Giao dịch cổng thanh toán cần được hoàn tiền xác nhận trước khi hủy. Chỉ demo mock/free hỗ trợ hoàn tự động.',
          );
        assertTransition(order.status, 'cancelled');
        // A mock refund is an internal atomic operation; it never claims to refund an external bank.
        await tx.payments.update({
          where: { payment_id: charged.payment_id },
          data: { status: 'refunded' },
        });
        const earned = await tx.loyalty_transactions.aggregate({
          where: { order_id: id, type: 'EARN' },
          _sum: { loyalty_point: true },
        });
        const points = earned._sum.loyalty_point ?? 0;
        if (points > 0) {
          const changed = await tx.users.updateMany({
            where: { user_id: order.user_id, point: { gte: points } },
            data: { point: { decrement: points } },
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'Điểm thưởng cần đối soát trước khi hủy.',
            );
          await tx.loyalty_transactions.create({
            data: {
              user_id: order.user_id,
              order_id: id,
              type: 'ADJUST',
              loyalty_point: -points,
              description: `Thu hồi điểm đơn đã hoàn tiền ${order.order_code}`,
            },
          });
        }
        await tx.orders.update({
          where: { order_id: id },
          data: { stock_reserved: true },
        });
      } else {
        if (!['pending', 'payment_failed'].includes(order.status))
          throw new ConflictException('Chỉ hủy được đơn chưa bắt đầu pha chế.');
        assertTransition(order.status, 'cancelled');
      }
      await this.releaseStock(tx, id);
      return this.summary(
        await tx.orders.update({
          where: { order_id: id },
          data: { status: 'cancelled' },
        }),
      );
    });
  }

  async advance(id: string, status: order_status) {
    return this.prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.orders.findUnique({ where: { order_id: id } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
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
        await this.releaseStock(tx, order_id);
        await tx.orders.update({
          where: { order_id },
          data: { status: 'cancelled' },
        });
      });
    }
  }
}
