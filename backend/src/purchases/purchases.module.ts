import { Module } from '@nestjs/common';
import { PrismaPurchaseRepository } from './prisma-purchase.repository.js';
import { PURCHASE_REPOSITORY } from './purchase-repository.js';
import { PurchaseService } from './purchase.service.js';
import { PurchasesController } from './purchases.controller.js';

/** Aba Compras: notas fiscais dos gastos, preços por produto e mercados. */
@Module({
  controllers: [PurchasesController],
  providers: [
    PurchaseService,
    { provide: PURCHASE_REPOSITORY, useClass: PrismaPurchaseRepository },
  ],
})
export class PurchasesModule {}
