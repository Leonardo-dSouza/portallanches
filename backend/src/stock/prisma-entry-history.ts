import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { isReversible, type ReversalCandidate } from './entry-reversal.js';
import type { EntryRecord, ReversalCheck } from './stock-repository.js';

type Tx = Prisma.TransactionClient;

/** Histórico enxuto: a aba mostra as entradas recentes numa tela só. */
const MAX_HISTORY_ROWS = 200;

const ENTRY_LOT_SELECT = {
  id: true,
  supplyId: true,
  quantity: true,
  remaining: true,
  expiresOn: true,
  unitCost: true,
  createdAt: true,
  reversedAt: true,
  supply: { select: { name: true, countUnit: true } },
  createdBy: { select: { name: true } },
  movements: { select: { kind: true } },
} as const satisfies Prisma.StockLotSelect;

type EntryLotRow = Prisma.StockLotGetPayload<{
  select: typeof ENTRY_LOT_SELECT;
}>;

function toCandidate(row: EntryLotRow): ReversalCandidate {
  const kinds = row.movements.map((m) => m.kind);
  return {
    lotId: row.id,
    supplyName: row.supply.name,
    quantity: row.quantity.toString(),
    remaining: row.remaining.toString(),
    reversedAt: row.reversedAt,
    laterMovements: Math.max(kinds.length - 1, 0),
    isEntry: kinds.includes('ENTRY'),
  };
}

function toEntryRecord(row: EntryLotRow): EntryRecord {
  return {
    lotId: row.id,
    supplyId: row.supplyId,
    supplyName: row.supply.name,
    countUnit: row.supply.countUnit,
    quantity: row.quantity.toString(),
    remaining: row.remaining.toString(),
    expiresOn: row.expiresOn?.toISOString().slice(0, 10) ?? null,
    unitCost: row.unitCost?.toString() ?? null,
    createdByName: row.createdBy.name,
    createdAt: row.createdAt.toISOString(),
    reversedAt: row.reversedAt?.toISOString() ?? null,
    reversible: isReversible(toCandidate(row)),
  };
}

/**
 * Lotes nascidos de entrada (não as sobras da contagem) desde `since`, mais recentes primeiro.
 *
 * @example await findEntryHistory(prisma, new Date('2026-09-01'))
 */
export async function findEntryHistory(
  prisma: PrismaClient,
  since: Date,
): Promise<EntryRecord[]> {
  const rows = await prisma.stockLot.findMany({
    where: {
      createdAt: { gte: since },
      movements: { some: { kind: 'ENTRY' } },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_HISTORY_ROWS,
    select: ENTRY_LOT_SELECT,
  });
  return rows.map(toEntryRecord);
}

/**
 * Estorno dentro da transação: relê o lote, deixa `check` recusar e só então zera o saldo
 * com um movimento REVERSAL. O custo do insumo não volta (corrige-se no cadastro).
 *
 * @example await reverseEntryLot(tx, 42, user.id, assertReversible)
 */
export async function reverseEntryLot(
  tx: Tx,
  lotId: number,
  userId: number,
  check: ReversalCheck,
): Promise<boolean> {
  const row = await tx.stockLot.findUnique({
    where: { id: lotId },
    select: ENTRY_LOT_SELECT,
  });
  if (!row) return false;
  check(toCandidate(row));
  const { supplyId, quantity } = row;
  await tx.stockLot.update({
    where: { id: lotId },
    data: { remaining: 0, reversedAt: new Date() },
  });
  await tx.stockMovement.create({
    data: {
      supplyId,
      lotId,
      kind: 'REVERSAL',
      quantity: quantity.negated(),
      createdById: userId,
    },
  });
  return true;
}
