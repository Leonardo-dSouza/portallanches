import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/auth-decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/session-user.js';
import type { CostHistoryRow } from './cost-repository.js';
import { CostService } from './cost.service.js';
import type { CostPreviewView, CostSheetView } from './cost-types.js';

/**
 * Rotas da área de Custos para consulta da planilha, simulação, gravação e histórico.
 * Todas as operações são restritas ao perfil de ADMIN.
 */
@Controller('costs')
export class CostsController {
  constructor(@Inject(CostService) private readonly service: CostService) {}

  @Roles('ADMIN')
  @Get()
  sheet(): Promise<CostSheetView> {
    return this.service.sheet();
  }

  @Roles('ADMIN')
  @Post('preview')
  preview(@Body() body: unknown): Promise<CostPreviewView> {
    return this.service.preview(body);
  }

  @Roles('ADMIN')
  @Post('apply')
  apply(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<{ changeSetId: number }> {
    return this.service.apply(user, body);
  }

  @Roles('ADMIN')
  @Get('history')
  history(@Query('supplyId') rawSupplyId?: string): Promise<CostHistoryRow[]> {
    return this.service.history(rawSupplyId);
  }
}
