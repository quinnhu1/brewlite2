import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { ProductsService } from './products.service.js';

@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  findAllProduct() {
    return this.productsService.findAllProduct();
  }
  @Get(':id')
  findOneProduct(@Param('id') id: string) {
    return this.productsService.findOneProduct(id);
  }
}
