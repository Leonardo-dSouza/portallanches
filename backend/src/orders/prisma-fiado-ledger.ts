import type { PrismaClient } from '../generated/prisma/client.js';
import type { FiadoLedgerRow } from './order-fiado.js';

/** Pedido cuja forma é fiado (2026-10-25). */
const FIADO_ORDER = { paymentMethod: { isFiado: true } } as const;

const LEDGER_SELECT = {
  id: true,
  customerId: true,
  amount: true,
  canceledAt: true,
} as const;

type LedgerOrder = {
  id: number;
  customerId: number | null;
  amount: { toFixed(digits: number): string };
  canceledAt: Date | null;
};

/** Soma dos recebimentos não estornados de cada pedido, numa consulta agrupada. */
async function paidByOrder(
  prisma: PrismaClient,
  orderIds: number[],
): Promise<Map<number, string>> {
  const sums = await prisma.fiadoPayment.groupBy({
    by: ['orderId'],
    where: { orderId: { in: orderIds }, canceledAt: null },
    _sum: { amount: true },
  });
  return new Map(
    sums.map((sum) => [sum.orderId, sum._sum.amount?.toFixed(2) ?? '0.00']),
  );
}

/** Os outros fiados em aberto dos mesmos clientes: o "deve no total". */
async function otherOpenOrders(
  prisma: PrismaClient,
  targets: LedgerOrder[],
): Promise<LedgerOrder[]> {
  const customerIds = [
    ...new Set(targets.flatMap((t) => (t.customerId ? [t.customerId] : []))),
  ];
  if (customerIds.length === 0) return [];
  return prisma.order.findMany({
    where: {
      ...FIADO_ORDER,
      customerId: { in: customerIds },
      canceledAt: null,
      id: { notIn: targets.map((t) => t.id) },
    },
    select: LEDGER_SELECT,
  });
}

/**
 * O razão do fiado para uma lista de pedidos, sem N+1: os pedidos fiado entre eles, os outros
 * fiados em aberto dos mesmos clientes e o recebido de cada um (três consultas no máximo).
 *
 * @example await readFiadoLedger(prisma, [12, 13]) // [{ orderId: 12, paid: '20.00', … }]
 */
export async function readFiadoLedger(
  prisma: PrismaClient,
  orderIds: number[],
): Promise<FiadoLedgerRow[]> {
  const targets = await prisma.order.findMany({
    where: { ...FIADO_ORDER, id: { in: orderIds } },
    select: LEDGER_SELECT,
  });
  if (targets.length === 0) return [];
  const rows = [...targets, ...(await otherOpenOrders(prisma, targets))];
  const paid = await paidByOrder(
    prisma,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    orderId: row.id,
    customerId: row.customerId,
    amount: row.amount.toFixed(2),
    paid: paid.get(row.id) ?? '0.00',
    canceled: row.canceledAt !== null,
  }));
}
