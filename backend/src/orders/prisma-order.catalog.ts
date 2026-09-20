import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  CatalogEntry,
  DeliveryZoneEntry,
  OrderCatalog,
} from './order-repository.js';

@Injectable()
export class PrismaOrderCatalog implements OrderCatalog {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  findPaymentMethod(id: number): Promise<CatalogEntry | null> {
    return this.prisma.paymentMethod.findUnique({
      where: { id },
      select: { id: true, active: true },
    });
  }

  async findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null> {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    return (
      zone && { id: zone.id, active: zone.active, fee: zone.fee.toFixed(2) }
    );
  }
}
