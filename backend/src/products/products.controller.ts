import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { ProductService, type ProductView } from './product.service.js';
import type { SaleMenuItem } from './sale-menu.js';

/** Leitura aberta a qualquer logado (o caixa vai lançar por produto no Entregável 3); cadastro só do admin. */
@Controller()
export class ProductsController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  @Get('products')
  list(): Promise<ProductView[]> {
    return this.products.list();
  }

  /** Cardápio do caixa no dia (`?date=YYYY-MM-DD`, padrão hoje), com o preço daquele dia. */
  @Get('products/for-sale')
  listForSale(@Query('date') date?: string): Promise<SaleMenuItem[]> {
    return this.products.listForSale(date);
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
