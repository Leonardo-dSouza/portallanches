import { Inject, Injectable } from '@nestjs/common';
import { Customer, PrismaClient } from '../generated/prisma/client.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { CustomerInput } from './customer-input.js';
import type {
  CustomerRecord,
  CustomerRepository,
  CustomerZoneCheck,
} from './customer-repository.js';

const toCustomer = (row: Customer): CustomerRecord => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  street: row.street,
  number: row.number,
  reference: row.reference,
  deliveryZoneId: row.deliveryZoneId,
});

/** A chave de busca acompanha o nome em toda gravação. */
const withNameKey = (data: CustomerInput) => ({
  ...data,
  nameKey: toNeighborhoodKey(data.name),
});

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async findByPhone(phone: string): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({ where: { phone } });
    return row && toCustomer(row);
  }

  async findById(id: number): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    return row && toCustomer(row);
  }

  async findByNameKey(
    nameKey: string,
    limit: number,
  ): Promise<CustomerRecord[]> {
    const rows = await this.prisma.customer.findMany({
      where: { nameKey },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map(toCustomer);
  }

  async listStreets(deliveryZoneId: number | null): Promise<string[]> {
    const rows = await this.prisma.customer.findMany({
      where: deliveryZoneId === null ? {} : { deliveryZoneId },
      distinct: ['street'],
      select: { street: true },
      orderBy: { street: 'asc' },
    });
    return rows.map((row) => row.street);
  }

  async create(data: CustomerInput): Promise<CustomerRecord> {
    const row = await this.prisma.customer.create({ data: withNameKey(data) });
    return toCustomer(row);
  }

  async update(id: number, data: CustomerInput): Promise<CustomerRecord> {
    const row = await this.prisma.customer.update({
      where: { id },
      data: withNameKey(data),
    });
    return toCustomer(row);
  }
}

@Injectable()
export class PrismaCustomerZoneCheck implements CustomerZoneCheck {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async isActive(deliveryZoneId: number): Promise<boolean> {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id: deliveryZoneId },
      select: { active: true },
    });
    return zone?.active ?? false;
  }
}
