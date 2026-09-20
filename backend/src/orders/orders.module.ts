import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { ORDER_CATALOG, ORDER_REPOSITORY } from './order-repository.js';
import { OrderService } from './order.service.js';
import { OrdersController } from './orders.controller.js';
import { PrismaOrderCatalog } from './prisma-order.catalog.js';
import { PrismaOrderRepository } from './prisma-order.repository.js';

@Module({
  imports: [ClosingModule],
  controllers: [OrdersController],
  providers: [
    OrderService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: ORDER_CATALOG, useClass: PrismaOrderCatalog },
  ],
})
export class OrdersModule {}
