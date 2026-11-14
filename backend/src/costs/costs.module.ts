import { Module } from '@nestjs/common';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { COST_REPOSITORY } from './cost-repository.js';
import { CostService } from './cost.service.js';
import { CostsController } from './costs.controller.js';
import { PrismaCostRepository } from './prisma-cost.repository.js';

/**
 * Módulo da área de custos do PDV: cálculo e projeção de margens, fichas técnicas e salvamento.
 */
@Module({
  controllers: [CostsController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    CostService,
    { provide: COST_REPOSITORY, useClass: PrismaCostRepository },
  ],
  exports: [CostService],
})
export class CostsModule {}
