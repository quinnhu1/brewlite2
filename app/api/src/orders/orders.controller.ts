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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard, type AuthUser } from '../auth/jwt-auth.guard.js';
import { StaffGuard } from '../auth/staff.guard.js';
import { requireIdempotencyKey } from '../common/idempotency.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

class UpdateStatusDto {
  @IsIn(['preparing', 'ready', 'completed'])
  status!: 'preparing' | 'ready' | 'completed';
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
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
  quote(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.user_id, dto, undefined, true);
  }

  @Get('me')
  mine(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (page < 1 || page > 10000)
      throw new BadRequestException('Trang không hợp lệ.');
    return this.orders.findMine(user.user_id, page);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(user.user_id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.cancel(user.user_id, id);
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.orders.advance(id, dto.status);
  }
}
