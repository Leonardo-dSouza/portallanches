import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { fromDbDate, toDbDate } from '../common/db-date.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import type { OrderEventInput } from '../orders/order-events.js';
import { paidByOrder } from '../orders/prisma-fiado-ledger.js';
import { writeOrderEvent } from '../orders/prisma-order-events.js';
import { paymentSnapshot } from './fiado-events.js';
import type {
  FiadoCustomerRecord,
  FiadoOrderFilter,
  FiadoOrderRecord,
  FiadoPaymentCancel,
  FiadoPaymentRecord,
  FiadoRepository,
  NewFiadoPayment,
} from './fiado-repository.js';

const FIADO_ORDER_SELECT = {
  id: true,
  dayNumber: true,
  type: true,
  amount: true,
  canceledAt: true,
  fiadoDueDate: true,
  customerId: true,
  closing: { select: { businessDate: true } },
  customer: { select: { name: true, phone: true } },
} as const satisfies Prisma.OrderSelect;

type FiadoOrderRow = Prisma.OrderGetPayload<{
  select: typeof FIADO_ORDER_SELECT;
}>;

const PAYMENT_INCLUDE = {
  closing: { select: { businessDate: true } },
  order: {
    select: { dayNumber: true, closing: { select: { businessDate: true } } },
  },
} as const satisfies Prisma.FiadoPaymentInclude;

type FiadoPaymentRow = Prisma.FiadoPaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;

/** Pedido cuja forma é fiado (2026-10-25). */
const FIADO_ORDER = { paymentMethod: { isFiado: true } } as const;

/** O fiado sempre tem cliente (a aplicação exige); a linha sem ele fica de fora. */
function toOrder(
  row: FiadoOrderRow,
  paid: Map<number, string>,
): FiadoOrderRecord[] {
  if (row.customerId === null || row.customer === null) return [];
  return [
    {
      orderId: row.id,
      businessDate: fromDbDate(row.closing.businessDate),
      dayNumber: row.dayNumber,
      type: row.type,
      amount: row.amount.toFixed(2),
      paid: paid.get(row.id) ?? '0.00',
      canceled: row.canceledAt !== null,
      dueDate: row.fiadoDueDate && fromDbDate(row.fiadoDueDate),
      customerId: row.customerId,
      customerName: row.customer.name,
      customerPhone: row.customer.phone,
    },
  ];
}

function toPayment(row: FiadoPaymentRow): FiadoPaymentRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    orderDayNumber: row.order.dayNumber,
    orderBusinessDate: fromDbDate(row.order.closing.businessDate),
    closingId: row.closingId,
    businessDate: fromDbDate(row.closing.businessDate),
    amount: row.amount.toFixed(2),
    extra: row.extra.toFixed(2),
    paymentMethodId: row.paymentMethodId,
    paymentMode: row.paymentMode,
    createdAt: row.createdAt,
    canceledAt: row.canceledAt,
    cancelReason: row.cancelReason,
  };
}

/** Os fiados não cancelados do filtro: de um cliente, ou com a previsão até a data. */
function whereOf(filter: FiadoOrderFilter): Prisma.OrderWhereInput {
  const due = filter.dueBy && { fiadoDueDate: { lte: toDbDate(filter.dueBy) } };
  return {
    ...FIADO_ORDER,
    canceledAt: null,
    customerId: filter.customerId ?? { not: null },
    ...due,
  };
}

@Injectable()
export class PrismaFiadoRepository implements FiadoRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listOrders(filter: FiadoOrderFilter): Promise<FiadoOrderRecord[]> {
    const rows = await this.prisma.order.findMany({
      where: whereOf(filter),
      select: FIADO_ORDER_SELECT,
      orderBy: [{ closing: { businessDate: 'asc' } }, { dayNumber: 'asc' }],
    });
    return this.withPaid(rows);
  }

  async findOrder(orderId: number): Promise<FiadoOrderRecord | null> {
    const row = await this.prisma.order.findFirst({
      where: { ...FIADO_ORDER, id: orderId },
      select: FIADO_ORDER_SELECT,
    });
    if (!row) return null;
    const [order] = await this.withPaid([row]);
    return order ?? null;
  }

  findCustomer(id: number): Promise<FiadoCustomerRecord | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true },
    });
  }

  async listPayments(customerId: number): Promise<FiadoPaymentRecord[]> {
    const rows = await this.prisma.fiadoPayment.findMany({
      where: { order: { customerId } },
      include: PAYMENT_INCLUDE,
      orderBy: { id: 'desc' },
    });
    return rows.map(toPayment);
  }

  async findPayment(id: number): Promise<FiadoPaymentRecord | null> {
    const row = await this.prisma.fiadoPayment.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
    return row && toPayment(row);
  }

  /** O recebimento e o passo do histórico do pedido, na mesma transação. */
  createPayment(data: NewFiadoPayment): Promise<FiadoPaymentRecord> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.fiadoPayment.create({
        data,
        include: PAYMENT_INCLUDE,
      });
      const payment = toPayment(row);
      await writeOrderEvent(tx, data.orderId, {
        userId: data.createdById,
        managerAuthorized: false,
        details: { kind: 'FIADO_PAYMENT', payment: paymentSnapshot(payment) },
      });
      return payment;
    });
  }

  /** Condicional ao recebimento ativo: dois cliques não estornam duas vezes. */
  cancelPayment(
    id: number,
    { userId, at, reason }: FiadoPaymentCancel,
    event: OrderEventInput,
  ): Promise<FiadoPaymentRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.fiadoPayment.updateMany({
        where: { id, canceledAt: null },
        data: { canceledAt: at, canceledById: userId, cancelReason: reason },
      });
      if (count === 0) return null;
      const row = await tx.fiadoPayment.findUniqueOrThrow({
        where: { id },
        include: PAYMENT_INCLUDE,
      });
      await writeOrderEvent(tx, row.orderId, event);
      return toPayment(row);
    });
  }

  async setDueDate(
    orderId: number,
    dueDate: string | null,
    event: OrderEventInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { fiadoDueDate: dueDate && toDbDate(dueDate) },
      });
      await writeOrderEvent(tx, orderId, event);
    });
  }

  private async withPaid(rows: FiadoOrderRow[]): Promise<FiadoOrderRecord[]> {
    if (rows.length === 0) return [];
    const paid = await paidByOrder(
      this.prisma,
      rows.map((row) => row.id),
    );
    return rows.flatMap((row) => toOrder(row, paid));
  }
}
