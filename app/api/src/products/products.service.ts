import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAllProduct() {
    const [products, ranked] = await this.prisma.$transaction(
      [
        this.prisma.product.findMany({
          where: { isActive: true },
          select: {
            productId: true,
            productName: true,
            description: true,
            basePrice: true,
            imageUrl: true,
            stock: true,
            categories: true,
          },
          orderBy: { productId: 'asc' },
        }),
        this.prisma.order_items.groupBy({
          by: ['product_id'],
          where: {
            orders: { status: 'completed' },
            products: { isActive: true },
          },
          _sum: { quantity: true },
          having: { quantity: { _sum: { gt: 0 } } },
          orderBy: [{ _sum: { quantity: 'desc' } }, { product_id: 'asc' }],
          take: 3,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const rankByProduct = new Map(
      ranked.map(({ product_id }, index) => [product_id, index + 1]),
    );

    return products.map((product) => ({
      ...product,
      isBestSeller: rankByProduct.has(product.productId),
      bestSellerRank: rankByProduct.get(product.productId) ?? null,
    }));
  }
  async findOneProduct(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }

    const product = await this.prisma.product.findFirst({
      where: { productId: id, isActive: true },
      select: {
        productId: true,
        productName: true,
        description: true,
        basePrice: true,
        imageUrl: true,
        stock: true,
        categories: true,

        product_size: {
          select: {
            size_id: true,
            size: true,
            add_price: true,
          },
        },
        product_toppings: {
          where: {
            toppings: {
              is_active: true,
            },
          },
          select: {
            toppings: {
              select: {
                topping_id: true,
                topping_name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const { product_toppings, product_size, ...productDetail } = product;
    const sizeOrder = { S: 0, M: 1, L: 2 } as const;
    return {
      ...productDetail,
      product_size: [...product_size].sort(
        (left, right) =>
          (sizeOrder[left.size as keyof typeof sizeOrder] ?? 99) -
          (sizeOrder[right.size as keyof typeof sizeOrder] ?? 99),
      ),
      toppings: product_toppings.map(({ toppings }) => toppings),
    };
  }
  async giamSoLuongSanPham(
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Số lượng không hợp lệ');
    }

    const { count } = await tx.product.updateMany({
      where: { productId, isActive: true, stock: { gte: quantity } },
      data: { stock: { decrement: quantity }, version: { increment: 1 } },
    });

    if (count === 0) {
      const p = await tx.product.findUnique({
        where: { productId },
        select: { productName: true, stock: true, isActive: true },
      });
      if (!p || !p.isActive) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      throw new BadRequestException(
        `"${p.productName}" chỉ còn ${p.stock} sản phẩm`,
      );
    }
  }
  async tangSoLuongSanPham(
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Số lượng tăng phải là số nguyên dương');
    }

    const { count } = await tx.product.updateMany({
      where: { productId, isActive: true },
      data: { stock: { increment: quantity }, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
  }
}
