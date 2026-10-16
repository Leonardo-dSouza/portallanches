import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { OrderEventInput, OrderEventRecord } from './order-events.js';
import { toEntries, writeItems } from './prisma-order-items.js';
import { listOrderEvents, writeOrderEvent } from './prisma-order-events.js';
import type {
  OrderCancel,
  OrderData,
  OrderRecord,
  OrderRepository,
  SavedOrder,
  StatusChange,
  StockChange,
} from './order-repository.js';
import {
  ORDER_STOCK,
  type OrderStockWriter,
  type SaleShortfall,
} from './order-stock.js';

const WITH_ITEMS = {
  include: { items: { orderBy: { id: 'asc' } } },
} as const satisfies Prisma.OrderDefaultArgs;

type OrderRow = Prisma.OrderGetPayload<typeof WITH_ITEMS>;

function toRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    closingId: row.closingId,
    dayNumber: row.dayNumber,
    status: row.status,
    createdById: row.createdById,
    createdAt: row.createdAt,
    statusChangedAt: row.statusChangedAt,
    canceledAt: row.canceledAt,
    cancelReason: row.cancelReason,
    amount: row.amount.toFixed(2),
    items: toEntries(row.items),
    type: row.type,
    paymentMethodId: row.paymentMethodId,
    paymentMode: row.paymentMode,
    deliveryZoneId: row.deliveryZoneId,
    deliveryFee: row.deliveryFee?.toFixed(2) ?? null,
    changeFor: row.changeFor?.toFixed(2) ?? null,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerStreet: row.customerStreet,
    customerNumber: row.customerNumber,
    customerReference: row.customerReference,
  };
}

/**
 * Próximo número do dia (#1, #2…), pelo contador do fechamento: o UPDATE trava a linha até o
 * fim da transação (dois pedidos ao mesmo tempo não pegam o mesmo número) e o contador nunca
 * volta (apagar o último pedido não faz o próximo repetir o número dele).
 */
async function nextDayNumber(
  tx: Prisma.TransactionClient,
  closingId: number,
): Promise<number> {
  const { lastOrderNumber } = await tx.dailyClosing.update({
    where: { id: closingId },
    data: { lastOrderNumber: { increment: 1 } },
    select: { lastOrderNumber: true },
  });
  return lastOrderNumber;
}

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ORDER_STOCK) private readonly stock: OrderStockWriter,
  ) {}

  create(
    closingId: number,
    createdById: number,
    data: OrderData,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<SavedOrder> {
    const { items, ...fields } = data;
    return this.prisma.$transaction(async (tx) => {
      const dayNumber = await nextDayNumber(tx, closingId);
      const { id } = await tx.order.create({
        data: { ...fields, closingId, createdById, dayNumber },
      });
      await writeItems(tx, id, items);
      await writeOrderEvent(tx, id, event);
      return this.savedOrder(tx, id, stock);
    });
  }

  async findById(id: number): Promise<OrderRecord | null> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      ...WITH_ITEMS,
    });
    return row && toRecord(row);
  }

  /** Troca as linhas inteiras e a baixa no estoque na mesma transação do pedido. */
  update(
    id: number,
    data: OrderData,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<SavedOrder> {
    const { items, ...fields } = data;
    return this.prisma.$transaction(async (tx) => {
      // Apagar as linhas leva junto os adicionais (cascata do item pai).
      await tx.order.update({
        where: { id },
        data: { ...fields, items: { deleteMany: {} } },
      });
      await writeItems(tx, id, items);
      await writeOrderEvent(tx, id, event);
      return this.savedOrder(tx, id, stock);
    });
  }

  /** Condicional ao status de origem: dois cliques ao mesmo tempo não andam dois passos. */
  updateStatus(
    id: number,
    { from, to, at }: StatusChange,
    event: OrderEventInput,
  ): Promise<OrderRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from, canceledAt: null },
        data: { status: to, statusChangedAt: at },
      });
      if (count === 0) return null;
      await writeOrderEvent(tx, id, event);
      const row = await tx.order.findUniqueOrThrow({
        where: { id },
        ...WITH_ITEMS,
      });
      return toRecord(row);
    });
  }

  /** A baixa volta toda (necessidade vazia); os movimentos continuam presos ao pedido. */
  cancel(
    id: number,
    { reason, at }: OrderCancel,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<OrderRecord> {
    const returned = stock && { ...stock, needs: [] };
    return this.prisma.$transaction(async (tx) => {
      await this.syncStock(tx, id, returned);
      await writeOrderEvent(tx, id, event);
      const row = await tx.order.update({
        where: { id },
        data: { canceledAt: at, cancelReason: reason },
        ...WITH_ITEMS,
      });
      return toRecord(row);
    });
  }

  restore(
    id: number,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<OrderRecord> {
    return this.prisma.$transaction(async (tx) => {
      await this.syncStock(tx, id, stock);
      await writeOrderEvent(tx, id, event);
      const row = await tx.order.update({
        where: { id },
        data: { canceledAt: null, cancelReason: null },
        ...WITH_ITEMS,
      });
      return toRecord(row);
    });
  }

  listEvents(orderId: number): Promise<OrderEventRecord[]> {
    return listOrderEvents(this.prisma, orderId);
  }

  /** Baixa no estoque e o pedido relido (com as linhas em árvore) para a resposta. */
  private async savedOrder(
    tx: Prisma.TransactionClient,
    id: number,
    stock: StockChange | null,
  ): Promise<SavedOrder> {
    const stockShortfalls = await this.syncStock(tx, id, stock);
    const row = await tx.order.findUniqueOrThrow({
      where: { id },
      ...WITH_ITEMS,
    });
    return { ...toRecord(row), stockShortfalls };
  }

  private async syncStock(
    tx: Prisma.TransactionClient,
    orderId: number,
    stock: StockChange | null,
  ): Promise<SaleShortfall[]> {
    if (!stock) return [];
    return this.stock.syncSale(tx, orderId, stock.userId, stock.needs);
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
