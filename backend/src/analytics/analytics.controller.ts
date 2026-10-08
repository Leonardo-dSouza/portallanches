import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import type { AnalyticsReport } from './analytics-report.js';
import { AnalyticsService } from './analytics.service.js';

/** Números para o gerente (só admin, decisão do usuário em 2026-10-07). */
@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  /** Ex.: `GET /analytics?from=2026-09-01&to=2026-09-30` (um dia: from = to). */
  @Roles('ADMIN')
  @Get()
  byRange(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ): Promise<AnalyticsReport> {
    return this.analytics.forRange(from, to);
  }
}
