import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  ApiAuthRequired,
  ApiConflict,
  ApiForbidden,
  ApiIdempotencyKey,
  ApiNotFound,
  ApiValidationError,
} from '../common/api-docs.js';
import { RefundReceiptDto } from '../refunds/dto/refund-receipt.dto.js';
import { RefundsService } from '../refunds/refunds.service.js';
import {
  CancelOrderResponseDto,
  OrderDetailDto,
  OrderPageDto,
  OrderQuoteDto,
  OrderSummaryDto,
} from './dto/order-response.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/jwt-auth.guard.js';
import { StaffGuard } from '../auth/staff.guard.js';
import { requireIdempotencyKey } from '../common/idempotency.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

class UpdateStatusDto {
  @ApiProperty({ enum: ['preparing', 'ready', 'completed'] })
  @IsIn(['preparing', 'ready', 'completed'])
  status!: 'preparing' | 'ready' | 'completed';
}

@ApiTags('orders')
@ApiBearerAuth()
@ApiAuthRequired()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly refunds: RefundsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo đơn và giữ kho 20 phút',
    description:
      'Giá, phụ thu size, topping và khuyến mãi do server tính từ DB. Gửi price/cost/total trong body hoặc trong items sẽ bị 400.',
  })
  @ApiIdempotencyKey('tạo đơn')
  @ApiCreatedResponse({ type: OrderSummaryDto, description: 'Đơn PENDING; gửi lại cùng key + nội dung trả đúng đơn cũ.' })
  @ApiValidationError([
    'items.0.property price should not exist',
    'items.0.quantity must not be greater than 50',
  ])
  @ApiConflict(
    'Key đã dùng cho nội dung/tài khoản khác, hoặc tồn kho vừa thay đổi.',
    'Idempotency-Key đã được dùng cho nội dung khác.',
  )
  @ApiNotFound('Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng bán.')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.orders.createOrder(
      user.user_id,
      dto,
      requireIdempotencyKey(key),
    );
  }

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({ summary: 'Báo giá giỏ hàng (không tạo đơn, không giữ kho)' })
  @ApiOkResponse({ type: OrderQuoteDto })
  @ApiValidationError('Mã giảm giá không tồn tại, chưa bắt đầu hoặc đã hết hạn.')
  quote(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.user_id, dto, undefined, true);
  }

  @Get('me')
  @ApiOperation({ summary: 'Lịch sử đơn của người đang đăng nhập (20 đơn/trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiOkResponse({ type: OrderPageDto })
  mine(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (page < 1 || page > 10000)
      throw new BadRequestException('Trang không hợp lệ.');
    return this.orders.findMine(user.user_id, page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một đơn của chính mình (kèm payment và chứng từ hoàn nếu có)' })
  @ApiOkResponse({ type: OrderDetailDto })
  @ApiNotFound('Không tìm thấy đơn hàng.')
  one(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(user.user_id, id);
  }

  @Get(':id/refund')
  @ApiOperation({ summary: 'Chứng từ hoàn tiền của đơn (chỉ chủ đơn xem được)' })
  @ApiOkResponse({ type: RefundReceiptDto })
  @ApiNotFound('Đơn hàng không có chứng từ hoàn tiền.')
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.refunds.receiptForUser(user.user_id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hủy đơn',
    description:
      'Đơn chưa trả: trả kho, không sinh hoàn tiền. Đơn đã trả bằng mock/free và chưa pha chế: tạo một chứng từ hoàn, hoàn kho và thu hồi điểm đúng một lần. Gọi lại trả cùng kết quả.',
  })
  @ApiOkResponse({ type: CancelOrderResponseDto })
  @ApiConflict(
    'Đơn đã bắt đầu pha chế, đang chờ cổng thanh toán xác nhận, hoặc là giao dịch cổng thật cần hoàn thủ công.',
    'Chỉ hủy được đơn chưa bắt đầu pha chế.',
  )
  @ApiNotFound('Không tìm thấy đơn hàng.')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.cancel(user.user_id, id);
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: 'Nhân viên chuyển trạng thái pha chế' })
  @ApiOkResponse({ type: OrderSummaryDto })
  @ApiForbidden()
  @ApiConflict('Chuyển trạng thái sai chuỗi.', 'Không thể chuyển đơn từ paid sang completed.')
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.orders.advance(id, dto.status);
  }
}
