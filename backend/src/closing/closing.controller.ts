import {
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

/** Caixa e admin operam o dia de hoje (ou a data em `?date=`, dentro da janela do perfil); histórico é só do admin e a reabertura do caixa vale só para o último dia. */
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

  /** Caixa também reabre, mas só o último dia com fechamento (regra em `assertCanReopen`). */
  @Post(':date/reopen')
  @HttpCode(200)
  reopen(
    @Param('date') date: string,
    @CurrentUser() user: SessionUser,
  ): Promise<ClosingRecord> {
    return this.closings.reopenFor(user, date);
  }
}
