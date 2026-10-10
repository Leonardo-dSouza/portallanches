import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { fromMilli, toMilli } from '../common/quantity.js';
import { DATABASE_CLIENT } from '../prisma/prisma.service.js';
import { findEntryHistory, reverseEntryLot } from './prisma-entry-history.js';
import { toBalance } from './prisma-lot-balance.js';
import { settleOversalesWithEntry } from './prisma-oversale-settlement.js';
import type { StockCountItemInput } from './stock-input.js';
import type {
  CountPlanner,
  EntryRecord,
  EntrySupply,
  LotRecord,
  NewLot,
  ReversalCheck,
  StockRepository,
} from './stock-repository.js';
import type { SupplySnapshot } from './stock-status.js';

type Tx = Prisma.TransactionClient;

const SNAPSHOT_SELECT = {
  id: true,
  name: true,
  countUnit: true,
  minStock: true,
  sectionId: true,
  dailyCount: true,
  lots: {
    where: { remaining: { gt: 0 } },
    select: { id: true, remaining: true, expiresOn: true },
  },
  counts: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { status: true, quantity: true, createdAt: true },
  },
  movements: {
    where: { kind: 'ENTRY' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { createdAt: true },
  },
  oversales: { select: { quantity: true } },
} as const satisfies Prisma.SupplySelect;

type SnapshotRow = Prisma.SupplyGetPayload<{ select: typeof SNAPSHOT_SELECT }>;

const toDbDate = (key: string | null) =>
  key === null ? null : new Date(`${key}T00:00:00Z`);

function toSnapshot(row: SnapshotRow): SupplySnapshot {
  // Sem contagem a lista vem vazia: `count` é undefined e precisa virar null na resposta.
  const count = row.counts.at(0);
  return {
    supplyId: row.id,
    name: row.name,
    sectionId: row.sectionId,
    countUnit: row.countUnit,
    minStock: row.minStock?.toString() ?? null,
    dailyCount: row.dailyCount,
    lots: row.lots.map(toBalance),
    lastCount: count
      ? {
          status: count.status,
          quantity: count.quantity?.toString() ?? null,
          countedAt: count.createdAt.toISOString(),
        }
      : null,
    lastEntryAt: row.movements[0]?.createdAt.toISOString() ?? null,
    oversoldMilli: row.oversales.reduce(
      (sum, o) => sum + toMilli(o.quantity.toString()),
      0,
    ),
  };
}

@Injectable()
export class PrismaStockRepository implements StockRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly prisma: PrismaClient) {}

  async listSnapshots(): Promise<SupplySnapshot[]> {
    const rows = await this.prisma.supply.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: SNAPSHOT_SELECT,
    });
    return rows.map(toSnapshot);
  }

  async findEntrySupplies(ids: number[]): Promise<EntrySupply[]> {
    const rows = await this.prisma.supply.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, active: true, packages: true },
    });
    return rows.map((row) => ({
      ...row,
      packages: row.packages.map((p) => ({
        name: p.name,
        quantity: p.quantity.toString(),
      })),
    }));
  }

  async activeSupplyIds(ids: number[]): Promise<number[]> {
    const rows = await this.prisma.supply.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  addLots(lots: NewLot[]): Promise<LotRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const records: LotRecord[] = [];
      for (const lot of lots) records.push(await createEntryLot(tx, lot));
      return records;
    });
  }

  listEntries(since: Date): Promise<EntryRecord[]> {
    return findEntryHistory(this.prisma, since);
  }

  reverseLot(
    lotId: number,
    userId: number,
    check: ReversalCheck,
  ): Promise<boolean> {
    return this.prisma.$transaction((tx) =>
      reverseEntryLot(tx, lotId, userId, check),
    );
  }

  async saveCounts(
    userId: number,
    items: StockCountItemInput[],
    planner: CountPlanner,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) await saveCount(tx, userId, item, planner);
    });
  }
}

/** Entrada: lote novo e, com custo pago, o custo do insumo passa a ser esse (último custo). */
async function createEntryLot(tx: Tx, lot: NewLot): Promise<LotRecord> {
  const record = await createLot(tx, lot, 'ENTRY');
  await settleOversalesWithEntry(tx, {
    lotId: record.id,
    supplyId: lot.supplyId,
    quantityMilli: toMilli(lot.quantity),
    userId: lot.createdById,
  });
  if (lot.unitCost !== null)
    await tx.supply.update({
      where: { id: lot.supplyId },
      data: { unitCost: lot.unitCost },
    });
  return record;
}

/** Lote novo (entrada ou sobra da contagem) com o movimento que o originou. */
async function createLot(
  tx: Tx,
  lot: NewLot,
  kind: 'ENTRY' | 'COUNT',
): Promise<LotRecord> {
  const { supplyId, quantity, createdById } = lot;
  const row = await tx.stockLot.create({
    data: {
      supplyId,
      quantity,
      remaining: quantity,
      expiresOn: toDbDate(lot.expiresOn),
      unitCost: lot.unitCost,
      createdById,
      movements: { create: { supplyId, kind, quantity, createdById } },
    },
  });
  return { ...lot, id: row.id };
}

async function saveCount(
  tx: Tx,
  userId: number,
  item: StockCountItemInput,
  planner: CountPlanner,
): Promise<void> {
  const { supplyId, status, quantity } = item;
  await tx.stockCount.create({
    data: { supplyId, status, quantity, createdById: userId },
  });
  if (quantity === null) return;
  // A contagem mostra o real: a venda além do saldo que estava pendente deixa de valer.
  await tx.stockOversale.deleteMany({ where: { supplyId } });
  const lots = await tx.stockLot.findMany({
    where: { supplyId, remaining: { gt: 0 } },
  });
  const plan = planner(lots.map(toBalance), toMilli(quantity));
  for (const take of plan.takes) await takeFromLot(tx, userId, supplyId, take);
  if (plan.surplusMilli === 0) return;
  const surplus = fromMilli(plan.surplusMilli);
  const lot = {
    supplyId,
    quantity: surplus,
    expiresOn: null,
    createdById: userId,
    unitCost: null,
  };
  await createLot(tx, lot, 'COUNT');
}

async function takeFromLot(
  tx: Tx,
  userId: number,
  supplyId: number,
  take: { lotId: number; milli: number },
): Promise<void> {
  const quantity = fromMilli(take.milli);
  await tx.stockLot.update({
    where: { id: take.lotId },
    data: { remaining: { decrement: quantity } },
  });
  await tx.stockMovement.create({
    data: {
      supplyId,
      lotId: take.lotId,
      kind: 'COUNT',
      quantity: `-${quantity}`,
      createdById: userId,
    },
  });
}
