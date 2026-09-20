import { Module } from '@nestjs/common';
import {
  DELIVERY_ZONE_REPOSITORY,
  MOTOBOY_RATE_REPOSITORY,
  PAYMENT_METHOD_REPOSITORY,
} from './catalog-repository.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import {
  PrismaDeliveryZoneRepository,
  PrismaMotoboyRateRepository,
  PrismaPaymentMethodRepository,
} from './prisma-catalog.repositories.js';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: PAYMENT_METHOD_REPOSITORY,
      useClass: PrismaPaymentMethodRepository,
    },
    {
      provide: DELIVERY_ZONE_REPOSITORY,
      useClass: PrismaDeliveryZoneRepository,
    },
    { provide: MOTOBOY_RATE_REPOSITORY, useClass: PrismaMotoboyRateRepository },
  ],
})
export class CatalogModule {}
