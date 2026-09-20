import { Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';
import { ClosingService } from './closing.service.js';

/** Caixa e admin operam o dia de hoje; histórico e reabertura são só do admin. */
@Controller('closings')
export class ClosingController {
  constructor(
    @Inject(ClosingService) private readonly closings: ClosingService,
  ) {}

  @Get('today')
  today(): Promise<ClosingRecord> {
    return this.closings.getOrCreateToday();
  }

  @Post('today/close')
  @HttpCode(200)
  closeToday(@CurrentUser() user: SessionUser): Promise<ClosingRecord> {
    return this.closings.closeToday(user.id);
  }

  @Roles('ADMIN')
  @Get()
  list(): Promise<ClosingRecord[]> {
    return this.closings.list();
  }

  @Roles('ADMIN')
  @Get(':date')
  byDate(@Param('date') date: string): Promise<ClosingRecord> {
    return this.closings.getByDate(date);
  }

  @Roles('ADMIN')
  @Post(':date/close')
  @HttpCode(200)
  closeByDate(
    @Param('date') date: string,
    @CurrentUser() user: SessionUser,
  ): Promise<ClosingRecord> {
    return this.closings.closeByDate(date, user.id);
  }

  @Roles('ADMIN')
  @Post(':date/reopen')
  @HttpCode(200)
  reopen(
    @Param('date') date: string,
    @CurrentUser() user: SessionUser,
  ): Promise<ClosingRecord> {
    return this.closings.reopen(date, user.id);
  }
}
