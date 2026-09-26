import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type { ProductCategoryRecord } from './product-repository.js';
import { ProductService, type ProductView } from './product.service.js';

/** Leitura aberta a qualquer logado (o caixa vai lançar por produto no Entregável 3); cadastro só do admin. */
@Controller()
export class ProductsController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  @Get('product-categories')
  listCategories(): Promise<ProductCategoryRecord[]> {
    return this.products.listCategories();
  }

  @Get('products')
  list(): Promise<ProductView[]> {
    return this.products.list();
  }

  @Roles('ADMIN')
  @Post('products')
  create(@Body() body: unknown): Promise<ProductView> {
    return this.products.create(body);
  }

  @Roles('ADMIN')
  @Put('products/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ProductView> {
    return this.products.update(id, body);
  }
}
