import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingRecord } from './closing-repository.js';
import { ClosingService } from './closing.service.js';

/** Caixa opera a noite em andamento; o admin, qualquer dia (`?date=`). Histórico é só do admin; o caixa reabre só com a senha do admin. */
@Controller('closings')
export class ClosingController {
  constructor(
    @Inject(ClosingService) private readonly closings: ClosingService,
  ) {}

  @Get('today')
  today(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<ClosingRecord> {
    return this.closings.getFor(user, date);
  }

  @Post('today/close')
  @HttpCode(200)
  closeToday(
    @CurrentUser() user: SessionUser,
    @Query('date') date?: string,
  ): Promise<ClosingRecord> {
    return this.closings.closeFor(user, date);
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

  /** Caixa reabre só a noite em andamento, com a senha do admin no corpo (`reopenFor`). */
  @Post(':date/reopen')
  @HttpCode(200)
  reopen(
    @Param('date') date: string,
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<ClosingRecord> {
    return this.closings.reopenFor(user, date, body);
  }
}
