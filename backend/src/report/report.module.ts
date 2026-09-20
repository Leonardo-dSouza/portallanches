import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { PrismaReportSource } from './prisma-report.source.js';
import { REPORT_SOURCE } from './report-source.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';

@Module({
  imports: [ClosingModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    { provide: REPORT_SOURCE, useClass: PrismaReportSource },
  ],
})
export class ReportModule {}
