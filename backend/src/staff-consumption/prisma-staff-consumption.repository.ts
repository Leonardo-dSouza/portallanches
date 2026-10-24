import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { OrderEntry } from '../orders/order-pricing.js';
import type { StockChange } from '../orders/order-repository.js';
import {
  ORDER_STOCK,
  type OrderStockWriter,
  type SaleShortfall,
} from '../orders/order-stock.js';
import { nestedItemData, toEntries } from '../orders/prisma-order-items.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { uniqueRecentNames } from './consumer-names.js';
import type {
  SavedStaffConsumption,
  StaffConsumptionData,
  StaffConsumptionRecord,
  StaffConsumptionRepository,
} from './staff-consumption-repository.js';

type Tx = Prisma.TransactionClient;

const WITH_ITEMS = {
  include: { items: { orderBy: { id: 'asc' } } },
} as const satisfies Prisma.StaffConsumptionDefaultArgs;

type ConsumptionRow = Prisma.StaffConsumptionGetPayload<typeof WITH_ITEMS>;

function toRecord(row: ConsumptionRow): StaffConsumptionRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    createdById: row.createdById,
    createdAt: row.createdAt,
    consumerName: row.consumerName,
    consumerKey: row.consumerKey,
    items: toEntries(row.items),
  };
}

async function writeConsumptionItems(
  tx: Tx,
  staffConsumptionId: number,
  entries: OrderEntry[],
): Promise<void> {
  for (const entry of entries)
    await tx.staffConsumptionItem.create({
      data: nestedItemData(entry, { staffConsumptionId }),
    });
}

@Injectable()
export class PrismaStaffConsumptionRepository implements StaffConsumptionRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ORDER_STOCK) private readonly stock: OrderStockWriter,
  ) {}

  create(
    closingId: number,
    createdById: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption> {
    const { items, ...fields } = data;
    return this.prisma.$transaction(async (tx) => {
      const { id } = await tx.staffConsumption.create({
        data: { ...fields, closingId, createdById },
      });
      await writeConsumptionItems(tx, id, items);
      return this.saved(tx, id, stock);
    });
  }

  async findById(id: number): Promise<StaffConsumptionRecord | null> {
    const row = await this.prisma.staffConsumption.findUnique({
      where: { id },
      ...WITH_ITEMS,
    });
    return row && toRecord(row);
  }

  /** Troca as linhas inteiras e a baixa no estoque na mesma transação. */
  update(
    id: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption> {
    const { items, ...fields } = data;
    return this.prisma.$transaction(async (tx) => {
      // Apagar as linhas leva junto os adicionais (cascata do item pai).
      await tx.staffConsumption.update({
        where: { id },
        data: { ...fields, items: { deleteMany: {} } },
      });
      await writeConsumptionItems(tx, id, items);
      return this.saved(tx, id, stock);
    });
  }

  /** Devolve a baixa antes; sem `stock`, os movimentos ficam sem dono (SetNull), como no pedido. */
  async delete(id: number, stock: StockChange | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.syncStock(tx, id, stock);
      await tx.staffConsumption.delete({ where: { id } });
    });
  }

  async listByClosing(closingId: number): Promise<StaffConsumptionRecord[]> {
    const rows = await this.prisma.staffConsumption.findMany({
      where: { closingId },
      orderBy: { id: 'asc' },
      ...WITH_ITEMS,
    });
    return rows.map(toRecord);
  }

  async recentNames(since: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.staffConsumption.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { id: 'desc' },
      select: { consumerName: true, consumerKey: true },
    });
    return uniqueRecentNames(rows, limit);
  }

  private async saved(
    tx: Tx,
    id: number,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption> {
    const stockShortfalls = await this.syncStock(tx, id, stock);
    const row = await tx.staffConsumption.findUniqueOrThrow({
      where: { id },
      ...WITH_ITEMS,
    });
    return { ...toRecord(row), stockShortfalls };
  }

  private async syncStock(
    tx: Tx,
    staffConsumptionId: number,
    stock: StockChange | null,
  ): Promise<SaleShortfall[]> {
    if (!stock) return [];
    const owner = { staffConsumptionId };
    return this.stock.syncSale(tx, owner, stock.userId, stock.needs);
  }
}
