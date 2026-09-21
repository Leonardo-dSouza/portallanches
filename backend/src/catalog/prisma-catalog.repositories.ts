import { Inject, Injectable } from '@nestjs/common';
import {
  DeliveryZone,
  MotoboyRateSetting,
  PaymentMethod,
  PrismaClient,
} from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  DeliveryZoneRecord,
  DeliveryZoneRepository,
  MotoboyRateRecord,
  MotoboyRateRepository,
  PaymentMethodRecord,
  PaymentMethodRepository,
} from './catalog-repository.js';

const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

const toPaymentMethod = (row: PaymentMethod): PaymentMethodRecord => ({
  id: row.id,
  name: row.name,
  active: row.active,
  sortOrder: row.sortOrder,
});

const toZone = (row: DeliveryZone): DeliveryZoneRecord => ({
  id: row.id,
  neighborhood: row.neighborhood,
  neighborhoodKey: row.neighborhoodKey,
  fee: row.fee.toFixed(2),
  active: row.active,
});

const toRate = (row: MotoboyRateSetting): MotoboyRateRecord => ({
  id: row.id,
  dayGroup: row.dayGroup,
  amount: row.amount.toFixed(2),
  effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
  createdById: row.createdById,
});

@Injectable()
export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<PaymentMethodRecord[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toPaymentMethod);
  }

  async create(
    data: Omit<PaymentMethodRecord, 'id'>,
  ): Promise<PaymentMethodRecord> {
    return toPaymentMethod(await this.prisma.paymentMethod.create({ data }));
  }

  async update(
    id: number,
    data: Omit<PaymentMethodRecord, 'id'>,
  ): Promise<PaymentMethodRecord> {
    return toPaymentMethod(
      await this.prisma.paymentMethod.update({ where: { id }, data }),
    );
  }
}

@Injectable()
export class PrismaDeliveryZoneRepository implements DeliveryZoneRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<DeliveryZoneRecord[]> {
    const rows = await this.prisma.deliveryZone.findMany({
      orderBy: { neighborhood: 'asc' },
    });
    return rows.map(toZone);
  }

  async create(
    data: Omit<DeliveryZoneRecord, 'id'>,
  ): Promise<DeliveryZoneRecord> {
    return toZone(await this.prisma.deliveryZone.create({ data }));
  }

  async update(
    id: number,
    data: Omit<DeliveryZoneRecord, 'id'>,
  ): Promise<DeliveryZoneRecord> {
    return toZone(
      await this.prisma.deliveryZone.update({ where: { id }, data }),
    );
  }
}

@Injectable()
export class PrismaMotoboyRateRepository implements MotoboyRateRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async list(): Promise<MotoboyRateRecord[]> {
    const rows = await this.prisma.motoboyRateSetting.findMany({
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toRate);
  }

  async save(data: Omit<MotoboyRateRecord, 'id'>): Promise<MotoboyRateRecord> {
    const effectiveFrom = toDbDate(data.effectiveFrom);
    const row = await this.prisma.motoboyRateSetting.upsert({
      where: {
        dayGroup_effectiveFrom: { dayGroup: data.dayGroup, effectiveFrom },
      },
      update: { amount: data.amount, createdById: data.createdById },
      create: { ...data, effectiveFrom },
    });
    return toRate(row);
  }
}
