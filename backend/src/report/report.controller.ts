import { Controller, Get, Inject, Param } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type { ClosingReport } from './report-builder.js';
import { ReportService } from './report.service.js';

@Controller('closings')
export class ReportController {
  constructor(@Inject(ReportService) private readonly reports: ReportService) {}

  /** Caixa e admin conferem o dia de hoje antes de fechar. */
  @Get('today/report')
  today(): Promise<ClosingReport> {
    return this.reports.forToday();
  }

  @Roles('ADMIN')
  @Get(':date/report')
  byDate(@Param('date') date: string): Promise<ClosingReport> {
    return this.reports.forDate(date);
  }
}
