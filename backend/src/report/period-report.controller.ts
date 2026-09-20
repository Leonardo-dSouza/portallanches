import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type { PeriodReport } from './period-report.js';
import { PeriodReportService } from './period-report.service.js';

@Controller('reports')
export class PeriodReportController {
  constructor(
    @Inject(PeriodReportService) private readonly reports: PeriodReportService,
  ) {}

  /** Ex.: `GET /reports?from=2026-09-01&to=2026-09-30` (dia, semana, mês ou ano). */
  @Roles('ADMIN')
  @Get()
  byRange(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ): Promise<PeriodReport> {
    return this.reports.forRange(from, to);
  }
}
