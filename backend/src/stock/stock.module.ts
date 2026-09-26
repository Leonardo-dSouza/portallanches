import { Module } from '@nestjs/common';
import { readBusinessTimeZone } from '../closing/business-date.js';
import { BUSINESS_TIMEZONE, CLOCK } from '../common/clock.js';
import { PrismaStockRepository } from './prisma-stock.repository.js';
import { StockController } from './stock.controller.js';
import { STOCK_REPOSITORY } from './stock-repository.js';
import { StockService } from './stock.service.js';

@Module({
  controllers: [StockController],
  providers: [
    StockService,
    { provide: STOCK_REPOSITORY, useClass: PrismaStockRepository },
    { provide: CLOCK, useValue: () => new Date() },
    { provide: BUSINESS_TIMEZONE, useFactory: readBusinessTimeZone },
  ],
})
export class StockModule {}
