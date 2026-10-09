import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { ORDER_STOCK } from '../orders/order-stock.js';
import { PrismaSaleStock } from './prisma-sale-stock.js';
import { PrismaStockRepository } from './prisma-stock.repository.js';
import { StockController } from './stock.controller.js';
import { STOCK_REPOSITORY } from './stock-repository.js';
import { StockService } from './stock.service.js';

@Module({
  controllers: [StockController],
  providers: [
    StockService,
    { provide: STOCK_REPOSITORY, useClass: PrismaStockRepository },
    { provide: ORDER_STOCK, useClass: PrismaSaleStock },
    ...BUSINESS_CLOCK_PROVIDERS,
  ],
  // A baixa dos pedidos (OrdersModule) grava pelo estoque, na transação do pedido.
  exports: [ORDER_STOCK],
})
export class StockModule {}
