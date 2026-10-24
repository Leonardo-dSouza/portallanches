import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClosingModule } from '../closing/closing.module.js';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { SettingsModule } from '../settings/settings.module.js';
import { StockModule } from '../stock/stock.module.js';
import { CashierLockGuard } from './cashier-lock.guard.js';
import { OrderCancelService } from './order-cancel.service.js';
import { ORDER_CATALOG, ORDER_REPOSITORY } from './order-repository.js';
import { OrderStatusService } from './order-status.service.js';
import { OrderService } from './order.service.js';
import { OrdersController } from './orders.controller.js';
import { PrismaOrderCatalog } from './prisma-order.catalog.js';
import { PrismaOrderRepository } from './prisma-order.repository.js';

@Module({
  imports: [AuthModule, ClosingModule, SettingsModule, StockModule],
  controllers: [OrdersController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    OrderService,
    OrderStatusService,
    OrderCancelService,
    CashierLockGuard,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: ORDER_CATALOG, useClass: PrismaOrderCatalog },
  ],
  // O consumo interno usa o mesmo cardápio do dia (preço, CMV e composição).
  exports: [ORDER_CATALOG],
})
export class OrdersModule {}
