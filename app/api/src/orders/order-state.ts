import { ConflictException } from '@nestjs/common';
import type { order_status } from '@prisma/client';

const transitions: Partial<Record<order_status, readonly order_status[]>> = {
  pending: ['paid', 'payment_failed', 'cancelled'],
  payment_failed: ['pending', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['completed'],
};

export function assertTransition(from: order_status, to: order_status) {
  if (!transitions[from]?.includes(to)) {
    throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}.`);
  }
}
