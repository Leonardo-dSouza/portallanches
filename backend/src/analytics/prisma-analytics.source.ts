import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type {
  AnalyticsOrderRow,
  AnalyticsSource,
  CategoryOrderRow,
} from './analytics-source.js';

const ORDER_SELECT = {
  closingId: true,
  amount: true,
  type: true,
  paymentMethodId: true,
  paymentMode: true,
  deliveryFee: true,
  customerId: true,
  customerName: true,
  deliveryZone: { select: { neighborhood: true } },
  items: {
    select: {
      productId: true,
      productName: true,
      menuNumber: true,
      categoryName: true,
      quantity: true,
      unitPrice: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

const toAnalyticsOrder = (row: OrderRow): AnalyticsOrderRow => ({
  closingId: row.closingId,
  amount: row.amount.toFixed(2),
  type: row.type,
  paymentMethodId: row.paymentMethodId,
  paymentMode: row.paymentMode,
  deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
  neighborhood: row.deliveryZone?.neighborhood ?? null,
  customerId: row.customerId,
  customerName: row.customerName,
  items: row.items.map((item) => ({
    ...item,
    unitPrice: item.unitPrice.toFixed(2),
  })),
});

@Injectable()
export class PrismaAnalyticsSource implements AnalyticsSource {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listOrders(closingIds: number[]): Promise<AnalyticsOrderRow[]> {
    const rows = await this.prisma.order.findMany({
      where: { closingId: { in: closingIds } },
      select: ORDER_SELECT,
    });
    return rows.map(toAnalyticsOrder);
  }

  listCategoryOrder(): Promise<CategoryOrderRow[]> {
    return this.prisma.productCategory.findMany({
      select: { name: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }
}
