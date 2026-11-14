import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ProductDto } from './admin.dto.js';
@Injectable()
export class AdminService {
  constructor(
    private readonly db: PrismaService,
    private readonly orders: OrdersService,
  ) {}
  async products(q = '', category = '', page = 1, active = '') {
    const where: Prisma.ProductWhereInput = {
      ...(q ? { productName: { contains: q, mode: 'insensitive' } } : {}),
      ...(category ? { categories: category } : {}),
      ...(active === 'true' || active === 'false'
        ? { isActive: active === 'true' }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.product.findMany({
        where,
        orderBy: { productName: 'asc' },
        skip: (page - 1) * 20,
        take: 20,
        include: { product_size: true, product_toppings: true },
      }),
      this.db.product.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        ...p,
        basePrice: Number(p.basePrice),
        sizes: p.product_size.map((s) => ({
          size: s.size,
          addPrice: Number(s.add_price),
        })),
        toppingIds: p.product_toppings.map((t) => t.topping_id),
      })),
      total,
      page,
      page_size: 20,
    };
  }
  toppings() {
    return this.db.toppings.findMany({
      where: { is_active: true },
      orderBy: { topping_name: 'asc' },
    });
  }
  async save(dto: ProductDto, id?: string) {
    if (
      !dto.imageUrl.startsWith('/') ||
      dto.imageUrl.startsWith('//') ||
      dto.imageUrl.includes('..')
    )
      throw new BadRequestException(
        'Ảnh cần là đường dẫn nội bộ /images/... hoặc /imghome/... .',
      );
    if (
      dto.categories !== 'Pastry & Dessert' &&
      ['S', 'M', 'L'].some((s) => !dto.sizes.some((v) => v.size === s))
    )
      throw new BadRequestException('Đồ uống cần đủ size S, M và L.');
    if (dto.categories !== 'Pastry & Dessert' && dto.toppingIds.length === 0)
      throw new BadRequestException('Đồ uống cần ít nhất một topping phù hợp.');
    return this.db.$transaction(async (tx) => {
      const count = await tx.toppings.count({
        where: { topping_id: { in: dto.toppingIds }, is_active: true },
      });
      if (count !== dto.toppingIds.length)
        throw new BadRequestException(
          'Topping không hợp lệ hoặc đã ngừng bán.',
        );
      const data = {
        productName: dto.productName,
        description: dto.description?.trim() || null,
        basePrice: dto.basePrice,
        imageUrl: dto.imageUrl,
        categories: dto.categories,
        stock: dto.stock,
        isActive: dto.isActive,
      };
      let productId = id;
      if (id) {
        if (!dto.version)
          throw new BadRequestException('Cần version khi sửa sản phẩm.');
        const result = await tx.product.updateMany({
          where: { productId: id, version: dto.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (!result.count) {
          if (!(await tx.product.findUnique({ where: { productId: id } })))
            throw new NotFoundException('Không tìm thấy sản phẩm.');
          throw new ConflictException(
            'Sản phẩm hoặc tồn kho vừa thay đổi. Hãy tải lại trước khi sửa.',
          );
        }
        await tx.product_size.deleteMany({ where: { product_id: id } });
        await tx.product_toppings.deleteMany({ where: { product_id: id } });
      } else {
        productId = (await tx.product.create({ data })).productId;
      }
      await tx.product_size.createMany({
        data: dto.sizes.map((s) => ({
          product_id: productId!,
          size: s.size,
          add_price: s.addPrice,
        })),
      });
      if (dto.toppingIds.length)
        await tx.product_toppings.createMany({
          data: dto.toppingIds.map((topping_id) => ({
            product_id: productId!,
            topping_id,
          })),
        });
      return {
        productId,
        ...data,
        basePrice: Number(data.basePrice),
        version: id ? dto.version! + 1 : 1,
      };
    });
  }
  async listOrders(view: string, q: string, status: string, page: number) {
    const allowed = [
      'pending',
      'payment_failed',
      'paid',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ];
    if (status && !allowed.includes(status))
      throw new BadRequestException('Trạng thái không hợp lệ.');
    const where: Prisma.ordersWhereInput = {
      ...(view === 'tracking'
        ? {
            status: {
              in: ['pending', 'payment_failed', 'paid', 'preparing', 'ready'],
            },
          }
        : {}),
      ...(status
        ? { status: status as import('@prisma/client').order_status }
        : {}),
      ...(q
        ? {
            OR: [
              { order_code: { contains: q, mode: 'insensitive' } },
              { customer_name: { contains: q, mode: 'insensitive' } },
              { customer_phone: { contains: q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.orders.findMany({
        where,
        orderBy: [{ created: 'desc' }, { order_id: 'desc' }],
        take: 20,
        skip: (page - 1) * 20,
        include: {
          order_items: true,
          users: { select: { name: true, email: true } },
          payments: { orderBy: { created_at: 'desc' }, take: 1 },
        },
      }),
      this.db.orders.count({ where }),
    ]);
    return {
      items: rows.map((o) => ({
        order_id: o.order_id,
        order_code: o.order_code,
        status: o.status.toUpperCase(),
        total: Number(o.total),
        created_at: o.created.toISOString(),
        customer_name: o.customer_name || o.users.name,
        customer_phone: o.customer_phone,
        pickup_method: o.pickup_method,
        delivery_address: o.delivery_address,
        items: o.order_items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          size: i.size,
        })),
        payment: o.payments[0]
          ? {
              status: o.payments[0].status,
              provider: o.payments[0].provider,
              method: o.payments[0].method,
            }
          : null,
      })),
      total,
      page,
      page_size: 20,
    };
  }
  async order(id: string) {
    const o = await this.db.orders.findUnique({
      where: { order_id: id },
      select: { user_id: true, customer_phone: true, order_note: true },
    });
    if (!o) throw new NotFoundException('Không tìm thấy đơn.');
    return {
      ...(await this.orders.findOne(o.user_id, id)),
      customer_phone: o.customer_phone,
      order_note: o.order_note,
    };
  }
}
