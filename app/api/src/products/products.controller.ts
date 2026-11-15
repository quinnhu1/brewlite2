import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { ApiNotFound } from '../common/api-docs.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  @ApiOperation({ summary: 'Menu: các món đang bán' })
  findAllProduct() {
    return this.productsService.findAllProduct();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết món: size, phụ thu và topping được phép' })
  @ApiNotFound('Không tìm thấy sản phẩm.')
  findOneProduct(@Param('id') id: string) {
    return this.productsService.findOneProduct(id);
  }
}
