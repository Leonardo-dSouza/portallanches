import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { EntryRecord, LotRecord } from './stock-repository.js';
import type { StockItem } from './stock-status.js';
import { StockService } from './stock.service.js';

/** Aberto a caixa e admin: os dois lançam entradas e contagens (decisão do usuário). */
@Controller('stock')
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Get()
  list(): Promise<StockItem[]> {
    return this.stock.list();
  }

  @Get('entries')
  listEntries(@Query('days') days?: string): Promise<EntryRecord[]> {
    return this.stock.listEntries({ days });
  }

  @Post('entries')
  addEntries(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<LotRecord[]> {
    return this.stock.addEntries(user, body);
  }

  @Post('entries/:lotId/reversal')
  @HttpCode(204)
  reverseEntry(
    @CurrentUser() user: SessionUser,
    @Param('lotId', ParseIntPipe) lotId: number,
  ): Promise<void> {
    return this.stock.reverseEntry(user, lotId);
  }

  @Post('counts')
  @HttpCode(204)
  saveCounts(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<void> {
    return this.stock.saveCounts(user, body);
  }
}
