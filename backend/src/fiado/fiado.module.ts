import { Module } from '@nestjs/common';
import { ClosingModule } from '../closing/closing.module.js';
import { BUSINESS_CLOCK_PROVIDERS } from '../common/clock-providers.js';
import { OrdersModule } from '../orders/orders.module.js';
import { FIADO_REPOSITORY } from './fiado-repository.js';
import { FiadoController } from './fiado.controller.js';
import { FiadoPaymentService } from './fiado-payment.service.js';
import { FiadoQueryService } from './fiado-query.service.js';
import { PrismaFiadoRepository } from './prisma-fiado.repository.js';

/** Fiado, pagar depois (2026-10-25): listas, extrato, receber, estornar e remarcar. */
@Module({
  imports: [ClosingModule, OrdersModule],
  controllers: [FiadoController],
  providers: [
    ...BUSINESS_CLOCK_PROVIDERS,
    FiadoQueryService,
    FiadoPaymentService,
    { provide: FIADO_REPOSITORY, useClass: PrismaFiadoRepository },
  ],
})
export class FiadoModule {}
