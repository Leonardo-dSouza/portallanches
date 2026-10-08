import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClosingModule } from './closing/closing.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ReportModule } from './report/report.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { UsersModule } from './users/users.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { SuppliesModule } from './supplies/supplies.module.js';
import { StockModule } from './stock/stock.module.js';
import { ProductsModule } from './products/products.module.js';
import { SpreadsheetImportModule } from './spreadsheet-import/spreadsheet-import.module.js';
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
    AnalyticsModule,
    CatalogModule,
    UsersModule,
    CustomersModule,
    SuppliesModule,
    StockModule,
    ProductsModule,
    SpreadsheetImportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
