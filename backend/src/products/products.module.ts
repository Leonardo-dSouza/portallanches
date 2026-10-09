import { Module } from '@nestjs/common';
import { BEVERAGE_LAYOUT } from '../beverage-import/beverage-layout.js';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { parseMenuMapping } from '../menu-import/menu-mapping.js';
import { CARDAPIO_MAPPING } from '../spreadsheet-import/import-configs.js';
import {
  IMPORTED_CATEGORY_KEYS,
  importedCategoryKeys,
} from './imported-categories.js';
import { PrismaProductCategoryRepository } from './prisma-product-category.repository.js';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product-repository.js';
import { ProductService } from './product.service.js';
import { ProductsController } from './products.controller.js';
import { ProductCategoriesController } from './product-categories.controller.js';
import { PRODUCT_CATEGORY_REPOSITORY } from './product-category-repository.js';
import { ProductCategoryService } from './product-category.service.js';

@Module({
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
    {
      provide: IMPORTED_CATEGORY_KEYS,
      useFactory: () =>
        importedCategoryKeys(
          parseMenuMapping(CARDAPIO_MAPPING),
          BEVERAGE_LAYOUT,
        ),
    },
  ],
})
export class ProductsModule {}
