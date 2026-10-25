import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { withUnitCostFor, type UnitCostView } from '../auth/cost-visibility.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { SupplyRecord, SupplySectionRecord } from './supply-repository.js';
import { SupplyService } from './supply.service.js';

/**
 * Lista aberta a qualquer logado (o caixa conta e lança entradas), mas o custo do insumo só vai
 * para o admin (2026-10-25); cadastro só do admin.
 */
@Controller('supplies')
export class SuppliesController {
  constructor(
    @Inject(SupplyService) private readonly supplies: SupplyService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
  ): Promise<UnitCostView<SupplyRecord>[]> {
    const supplies = await this.supplies.list();
    return supplies.map((supply) => withUnitCostFor(user, supply));
  }

  @Get('sections')
  listSections(): Promise<SupplySectionRecord[]> {
    return this.supplies.listSections();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: unknown): Promise<SupplyRecord> {
    return this.supplies.create(body);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<SupplyRecord> {
    return this.supplies.update(id, body);
  }
}
