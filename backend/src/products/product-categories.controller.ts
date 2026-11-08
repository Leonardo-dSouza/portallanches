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
import type { CategoryProductOrder } from './product-category-repository.js';
import {
  ProductCategoryService,
  type ProductCategoryView,
} from './product-category.service.js';

/** Leitura aberta a qualquer logado (filtros do cardápio); criar, ordenar e editar só o admin. */
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    @Inject(ProductCategoryService)
    private readonly categories: ProductCategoryService,
  ) {}

  @Get()
  list(): Promise<ProductCategoryView[]> {
    return this.categories.list();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: unknown): Promise<ProductCategoryView> {
    return this.categories.create(body);
  }

  // Antes do `:id`: senão o ParseIntPipe recusa "order" com 400.
  @Roles('ADMIN')
  @Put('order')
  reorder(@Body() body: unknown): Promise<ProductCategoryView[]> {
    return this.categories.reorder(body);
  }

  @Roles('ADMIN')
  @Put(':id/addon-category')
  setAddonCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ProductCategoryView> {
    return this.categories.setAddonCategory(id, body);
  }

  @Roles('ADMIN')
  @Put(':id/choice-category')
  setChoiceCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ProductCategoryView> {
    return this.categories.setChoiceCategory(id, body);
  }

  @Roles('ADMIN')
  @Get(':id/product-order')
  listProductOrder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CategoryProductOrder[]> {
    return this.categories.listProductOrder(id);
  }

  @Roles('ADMIN')
  @Put(':id/product-order')
  reorderProducts(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<CategoryProductOrder[]> {
    return this.categories.reorderProducts(id, body);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ProductCategoryView> {
    return this.categories.update(id, body);
  }
}
