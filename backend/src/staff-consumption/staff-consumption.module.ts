import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { OrdersModule } from '../orders/orders.module.js';
import { StockModule } from '../stock/stock.module.js';
import { PrismaStaffConsumptionRepository } from './prisma-staff-consumption.repository.js';
import { STAFF_CONSUMPTION_REPOSITORY } from './staff-consumption-repository.js';
import { StaffConsumptionController } from './staff-consumption.controller.js';
import { StaffConsumptionService } from './staff-consumption.service.js';

@Module({
  imports: [ClosingModule, OrdersModule, StockModule],
  controllers: [StaffConsumptionController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    StaffConsumptionService,
    {
      provide: STAFF_CONSUMPTION_REPOSITORY,
      useClass: PrismaStaffConsumptionRepository,
    },
  ],
})
export class StaffConsumptionModule {}
