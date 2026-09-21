import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingReport } from './report-builder.js';
import { ReportService } from './report.service.js';

@Controller('closings')
export class ReportController {
  constructor(@Inject(ReportService) private readonly reports: ReportService) {}

  /** Caixa e admin conferem o dia (hoje, ou `?date=`) antes de fechar. */
  @Get('today/report')
  today(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<ClosingReport> {
    return this.reports.forSelected(user, date);
  }

  @Roles('ADMIN')
  @Get(':date/report')
  byDate(@Param('date') date: string): Promise<ClosingReport> {
    return this.reports.forDate(date);
  }
}
