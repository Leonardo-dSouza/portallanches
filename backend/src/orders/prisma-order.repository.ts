import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { OrderLine } from './order-pricing.js';
import type {
  OrderData,
  OrderRecord,
  OrderRepository,
} from './order-repository.js';

const WITH_ITEMS = {
  include: { items: { orderBy: { id: 'asc' } } },
} as const satisfies Prisma.OrderDefaultArgs;

type OrderRow = Prisma.OrderGetPayload<typeof WITH_ITEMS>;
type ItemRow = OrderRow['items'][number];

const toLine = (item: ItemRow): OrderLine => ({
  productId: item.productId,
  productName: item.productName,
  menuNumber: item.menuNumber,
  categoryName: item.categoryName,
  quantity: item.quantity,
  unitPrice: item.unitPrice.toFixed(2),
  unitCmv: item.unitCmv?.toFixed(2) ?? null,
  cmvComplete: item.cmvComplete,
});

function toRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    createdById: row.createdById,
    amount: row.amount.toFixed(2),
    items: row.items.map(toLine),
    type: row.type,
    paymentMethodId: row.paymentMethodId,
    paymentMode: row.paymentMode,
    deliveryZoneId: row.deliveryZoneId,
    deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerStreet: row.customerStreet,
    customerNumber: row.customerNumber,
    customerReference: row.customerReference,
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
    const { items, ...fields } = data;
    const row = await this.prisma.order.create({
      data: { ...fields, closingId, createdById, items: { create: items } },
      ...WITH_ITEMS,
    });
    return toRecord(row);
  }

  async findById(id: number): Promise<OrderRecord | null> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      ...WITH_ITEMS,
    });
    return row && toRecord(row);
  }

  /** Troca as linhas inteiras na mesma escrita do pedido (o Prisma faz numa transação). */
  async update(id: number, data: OrderData): Promise<OrderRecord> {
    const { items, ...fields } = data;
    const row = await this.prisma.order.update({
      where: { id },
      data: { ...fields, items: { deleteMany: {}, create: items } },
      ...WITH_ITEMS,
    });
    return toRecord(row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.order.delete({ where: { id } });
  }

  async listByClosing(closingId: number): Promise<OrderRecord[]> {
    const rows = await this.prisma.order.findMany({
      where: { closingId },
      orderBy: { id: 'asc' },
      ...WITH_ITEMS,
    });
    return rows.map(toRecord);
  }
}
