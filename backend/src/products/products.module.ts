import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { SettingsModule } from '../settings/settings.module.js';
import { PrismaProductCategoryRepository } from './prisma-product-category.repository.js';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product-repository.js';
import { ProductService } from './product.service.js';
import { ProductsController } from './products.controller.js';
import { ProductCategoriesController } from './product-categories.controller.js';
import { PRODUCT_CATEGORY_REPOSITORY } from './product-category-repository.js';
import { ProductCategoryService } from './product-category.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [ProductsController, ProductCategoriesController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    ProductService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    ProductCategoryService,
    {
      provide: PRODUCT_CATEGORY_REPOSITORY,
      useClass: PrismaProductCategoryRepository,
    },
  ],
})
export class ProductsModule {}
