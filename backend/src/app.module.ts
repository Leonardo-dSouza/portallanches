import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClosingModule } from './closing/closing.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ReportModule } from './report/report.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClosingModule,
    OrdersModule,
    ExpensesModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
