import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { LotRecord } from './stock-repository.js';
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

  @Post('entries')
  addEntry(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<LotRecord> {
    return this.stock.addEntry(user, body);
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
