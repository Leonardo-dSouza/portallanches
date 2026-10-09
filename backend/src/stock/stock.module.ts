import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { PrismaStockRepository } from './prisma-stock.repository.js';
import { StockController } from './stock.controller.js';
import { STOCK_REPOSITORY } from './stock-repository.js';
import { StockService } from './stock.service.js';

@Module({
  controllers: [StockController],
  providers: [
    StockService,
    { provide: STOCK_REPOSITORY, useClass: PrismaStockRepository },
    ...BUSINESS_CLOCK_PROVIDERS,
  ],
})
export class StockModule {}
