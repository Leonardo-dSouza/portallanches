import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { ClosingModule } from '../closing/closing.module.js';
import { ReportModule } from '../report/report.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { ANALYTICS_SOURCE } from './analytics-source.js';
import { AnalyticsService } from './analytics.service.js';
import { PrismaAnalyticsSource } from './prisma-analytics.source.js';

/** Reaproveita do relatório as formas de pagamento e os totais por fechamento. */
@Module({
  imports: [ClosingModule, ReportModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    { provide: ANALYTICS_SOURCE, useClass: PrismaAnalyticsSource },
    // "Hoje" no fuso da lanchonete: corta o período em andamento para a comparação.
    ...BUSINESS_CLOCK_PROVIDERS,
  ],
})
export class AnalyticsModule {}
