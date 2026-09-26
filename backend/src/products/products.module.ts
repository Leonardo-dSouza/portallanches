import { Module } from '@nestjs/common';
import { PrismaProductRepository } from './prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product-repository.js';
import { ProductService } from './product.service.js';
import { ProductsController } from './products.controller.js';

@Module({
  controllers: [ProductsController],
  providers: [
    ProductService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
})
export class ProductsModule {}
