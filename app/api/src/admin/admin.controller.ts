import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { OrdersService } from '../orders/orders.service.js';
import { AdminService } from './admin.service.js';
import { ProductDto, AdminStatusDto } from './admin.dto.js';
function pageNumber(raw = '1') {
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 10000)
    throw new BadRequestException('Trang không hợp lệ.');
  return Number(raw);
}
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orders: OrdersService,
  ) {}
  @Get('products') products(
    @Query('q') q = '',
    @Query('category') category = '',
    @Query('page') page = '1',
    @Query('active') active = '',
  ) {
    return this.admin.products(
      q.slice(0, 100),
      category,
      pageNumber(page),
      active,
    );
  }
  @Get('toppings') toppings() {
    return this.admin.toppings();
  }
  @Post('products') create(@Body() dto: ProductDto) {
    return this.admin.save(dto);
  }
  @Put('products/:id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductDto,
  ) {
    return this.admin.save(dto, id);
  }
  @Get('orders') list(
    @Query('view') view = 'history',
    @Query('q') q = '',
    @Query('status') status = '',
    @Query('page') page = '1',
  ) {
    return this.admin.listOrders(
      view,
      q.slice(0, 100),
      status,
      pageNumber(page),
    );
  }
  @Get('orders/:id') one(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.order(id);
  }
  @Patch('orders/:id/status') status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminStatusDto,
  ) {
    return this.orders.advance(id, dto.status);
  }
}
