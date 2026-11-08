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
import { withUnitCostFor, type UnitCostView } from '../auth/cost-visibility.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { EntryRecord, LotRecord } from './stock-repository.js';
import type { StockItem } from './stock-status.js';
import { StockService } from './stock.service.js';
import type { SupplyMovementsReport } from './supply-movements.js';

/**
 * Aberto a caixa e admin: os dois lançam entradas e contagens (decisão do usuário). O custo da
 * entrada (que também vira o custo do insumo) só volta para o admin (2026-10-25).
 */
@Controller('stock')
export class StockController {
  constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Get()
  list(): Promise<StockItem[]> {
    return this.stock.list();
  }

  @Get('entries')
  async listEntries(
    @CurrentUser() user: SessionUser,
    @Query('days') days?: string,
  ): Promise<UnitCostView<EntryRecord>[]> {
    const entries = await this.stock.listEntries({ days });
    return entries.map((entry) => withUnitCostFor(user, entry));
  }

  /**
   * Movimentações agrupadas de um insumo com saldo acumulado e totalizadores do período.
   *
   * @example GET /stock/supplies/3/movements?from=2026-11-01&to=2026-11-08&kind=ENTRY
   */
  @Get('supplies/:supplyId/movements')
  listMovements(
    @Param('supplyId', ParseIntPipe) supplyId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('kind') kind?: string,
  ): Promise<SupplyMovementsReport> {
    return this.stock.listMovements(supplyId, { from, to, kind });
  }

  @Post('entries')
  async addEntries(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<UnitCostView<LotRecord>[]> {
    const lots = await this.stock.addEntries(user, body);
    return lots.map((lot) => withUnitCostFor(user, lot));
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
