import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundReceiptDto } from '../../refunds/dto/refund-receipt.dto.js';

export class OrderSummaryDto {
  @ApiProperty({ format: 'uuid' }) order_id!: string;
  @ApiProperty({ example: 'BL-20261115-1A2B3C4D5E' }) order_code!: string;
  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'PAID', 'PAYMENT_FAILED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
  })
  status!: string;
  @ApiProperty({ example: 30000, description: 'Tổng tiền món do server tính từ giá trong DB (VND).' })
  subtotal!: number;
  @ApiProperty({ example: 0 }) discount!: number;
  @ApiProperty({ example: 30000, description: 'subtotal - discount, không bao giờ âm.' })
  total!: number;
  @ApiProperty({ format: 'date-time' }) created_at!: string;
  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description: 'Hết hạn giữ hàng (20 phút). Sau thời điểm này đơn chưa trả bị hủy và trả kho.',
  })
  expires_at!: string | null;
}

export class OrderQuoteDto {
  @ApiProperty({ example: 30000 }) subtotal!: number;
  @ApiProperty({ example: 0 }) discount!: number;
  @ApiProperty({ example: 30000 }) total!: number;
  @ApiProperty({ example: 'QUOTE' }) status!: string;
  @ApiProperty({ example: 3, description: 'Điểm dự kiến (1 điểm / 10.000đ) nếu thanh toán thành công.' })
  loyalty_earned!: number;
}

export class CancelOrderResponseDto extends OrderSummaryDto {
  @ApiPropertyOptional({
    type: () => RefundReceiptDto,
    nullable: true,
    description: 'Chứng từ hoàn tiền khi hủy đơn đã trả bằng mock/free. Null nếu đơn chưa thu tiền.',
  })
  refund!: RefundReceiptDto | null;
}

class OrderItemToppingDto {
  @ApiProperty({ format: 'uuid' }) topping_id!: string;
  @ApiProperty({ example: 'Trân châu' }) topping_name!: string;
  @ApiProperty({ example: 5000 }) price!: number;
}

class OrderItemDetailDto {
  @ApiProperty({ format: 'uuid' }) orderitem_id!: string;
  @ApiProperty({ format: 'uuid' }) product_id!: string;
  @ApiProperty({ example: 'Espresso' }) product_name!: string;
  @ApiPropertyOptional({ nullable: true }) image_url!: string | null;
  @ApiProperty({ enum: ['S', 'M', 'L'] }) size!: string;
  @ApiProperty({ example: 3 }) quantity!: number;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty({ example: 10000 }) unit_price!: number;
  @ApiProperty({ example: 30000 }) line_total!: number;
  @ApiProperty({ type: [OrderItemToppingDto] }) toppings!: OrderItemToppingDto[];
}

class OrderPaymentDto {
  @ApiProperty({ format: 'uuid' }) payment_id!: string;
  @ApiProperty({ enum: ['pending', 'success', 'failed', 'refunded'] }) status!: string;
  @ApiProperty({ example: 'mock' }) provider!: string;
  @ApiProperty({ enum: ['cash', 'momo', 'vnpay', 'banking'] }) method!: string;
  @ApiPropertyOptional({ nullable: true }) payment_url!: string | null;
  @ApiProperty({ example: 30000 }) amount!: number;
  @ApiPropertyOptional({ nullable: true }) transaction_id!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) paid_at!: string | null;
}

export class OrderDetailDto extends OrderSummaryDto {
  @ApiPropertyOptional({ nullable: true }) customer_name!: string | null;
  @ApiPropertyOptional({ nullable: true }) customer_phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) order_note!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'AT_COUNTER' }) pickup_method!: string | null;
  @ApiPropertyOptional({ nullable: true }) delivery_address!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) scheduled_at!: string | null;
  @ApiProperty({ type: [OrderItemDetailDto] }) items!: OrderItemDetailDto[];
  @ApiPropertyOptional({ type: () => OrderPaymentDto, nullable: true, description: 'Lần thanh toán gần nhất.' })
  payment!: OrderPaymentDto | null;
  @ApiPropertyOptional({ type: () => RefundReceiptDto, nullable: true })
  refund!: RefundReceiptDto | null;
}

export class OrderPageDto {
  @ApiProperty({ type: [OrderDetailDto] }) items!: OrderDetailDto[];
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) page_size!: number;
  @ApiProperty({ example: 3 }) total!: number;
}
