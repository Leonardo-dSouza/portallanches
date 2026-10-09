import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product-repository.js';
import { ProductService } from './product.service.js';
import { ProductsController } from './products.controller.js';

@Module({
  controllers: [ProductsController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    ProductService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
})
export class ProductsModule {}
