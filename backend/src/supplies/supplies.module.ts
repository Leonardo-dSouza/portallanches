import { Module } from '@nestjs/common';
import { PrismaSupplyRepository } from './prisma-supply.repository.js';
import { SuppliesController } from './supplies.controller.js';
import { SUPPLY_REPOSITORY } from './supply-repository.js';
import { SupplyService } from './supply.service.js';

@Module({
  controllers: [SuppliesController],
  providers: [
    SupplyService,
    { provide: SUPPLY_REPOSITORY, useClass: PrismaSupplyRepository },
  ],
})
export class SuppliesModule {}
