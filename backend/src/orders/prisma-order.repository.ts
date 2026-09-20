import { Inject, Injectable } from '@nestjs/common';
import { Order, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  OrderData,
  OrderRecord,
  OrderRepository,
} from './order-repository.js';

function toRecord(row: Order): OrderRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    createdById: row.createdById,
    amount: row.amount.toFixed(2),
    type: row.type,
    paymentMethodId: row.paymentMethodId,
    deliveryZoneId: row.deliveryZoneId,
    deliveryFee: row.deliveryFee.toFixed(2),
  };
}

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async create(
    closingId: number,
    createdById: number,
    data: OrderData,
  ): Promise<OrderRecord> {
    const row = await this.prisma.order.create({
      data: { ...data, closingId, createdById },
    });
    return toRecord(row);
  }

  async findById(id: number): Promise<OrderRecord | null> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    return row && toRecord(row);
  }

  async update(id: number, data: OrderData): Promise<OrderRecord> {
    return toRecord(await this.prisma.order.update({ where: { id }, data }));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.order.delete({ where: { id } });
  }

  async listByClosing(closingId: number): Promise<OrderRecord[]> {
    const rows = await this.prisma.order.findMany({
      where: { closingId },
      orderBy: { id: 'asc' },
    });
    return rows.map(toRecord);
  }
}
