import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { PeriodReportController } from './period-report.controller.js';
import { PERIOD_REPORT_SOURCE } from './period-report-source.js';
import { PeriodReportService } from './period-report.service.js';
import { PrismaPeriodReportSource } from './prisma-period-report.source.js';
import { PrismaReportSource } from './prisma-report.source.js';
import { REPORT_SOURCE } from './report-source.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';

@Module({
  imports: [ClosingModule],
  controllers: [ReportController, PeriodReportController],
  providers: [
    ReportService,
    PeriodReportService,
    { provide: PERIOD_REPORT_SOURCE, useClass: PrismaPeriodReportSource },
    { provide: REPORT_SOURCE, useClass: PrismaReportSource },
  ],
})
export class ReportModule {}
