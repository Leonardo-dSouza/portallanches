import { fromDbDate } from '../common/db-date.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { SupplyMovementsSource } from './stock-repository.js';
import type { RawStockMovementRecord } from './supply-movements.js';

const RAW_MOVEMENT_SELECT = {
  id: true,
  supplyId: true,
  lotId: true,
  kind: true,
  quantity: true,
  orderId: true,
  staffConsumptionId: true,
  createdById: true,
  createdAt: true,
  createdBy: { select: { name: true } },
  order: {
    select: {
      dayNumber: true,
      closing: { select: { businessDate: true } },
    },
  },
  staffConsumption: {
    select: {
      consumerName: true,
    },
  },
} as const satisfies Prisma.StockMovementSelect;

type RawMovementRow = Prisma.StockMovementGetPayload<{
  select: typeof RAW_MOVEMENT_SELECT;
}>;

function toRawMovementRecord(row: RawMovementRow): RawStockMovementRecord {
  return {
    id: row.id,
    supplyId: row.supplyId,
    lotId: row.lotId,
    kind: row.kind,
    quantity: row.quantity.toString(),
    orderId: row.orderId,
    staffConsumptionId: row.staffConsumptionId,
    createdById: row.createdById,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt,
    order: row.order
      ? {
          dayNumber: row.order.dayNumber,
          businessDate: fromDbDate(row.order.closing.businessDate),
        }
      : null,
    staffConsumption: row.staffConsumption
      ? { consumerName: row.staffConsumption.consumerName }
      : null,
  };
}

/**
 * Busca os dados básicos do insumo e suas movimentações em ordem cronológica de `createdAt` e `id`.
 *
 * @example await findSupplyMovementsSource(prisma, 42)
 */
export async function findSupplyMovementsSource(
  prisma: PrismaClient,
  supplyId: number,
): Promise<SupplyMovementsSource | null> {
  const supply = await prisma.supply.findUnique({
    where: { id: supplyId },
    select: { id: true, name: true, countUnit: true },
  });
  if (!supply) return null;
  const rows = await prisma.stockMovement.findMany({
    where: { supplyId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: RAW_MOVEMENT_SELECT,
  });
  return {
    supply,
    movements: rows.map(toRawMovementRecord),
  };
}
