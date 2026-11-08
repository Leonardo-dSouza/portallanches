import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaStockRepository } from './prisma-stock.repository.js';

interface MockSupplyRow {
  id: number;
  name: string;
  countUnit: string;
  minStock: unknown;
  sectionId: number | null;
  dailyCount: boolean;
  deductOnSale: boolean;
  lots: { id: number; remaining: unknown; expiresOn: Date | null }[];
  counts: {
    status: 'COUNTED' | 'NOT_COUNTED' | 'NEEDS_PURCHASE';
    quantity: unknown;
    createdAt: Date;
  }[];
  movements: { createdAt: Date }[];
  oversales: { quantity: unknown }[];
  components: { id: number }[];
}

/** Fake nomeado do Prisma para testar consultas do estoque sem tocar no banco. */
class FakePrismaForStock {
  lastFindManyArgs: unknown = null;
  rows: MockSupplyRow[] = [];

  readonly supply = {
    findMany: async (args: unknown) => {
      this.lastFindManyArgs = args;
      return this.rows;
    },
  };
}

const buildRow = (overrides: Partial<MockSupplyRow>): MockSupplyRow => ({
  id: 1,
  name: 'Coca Cola 2L',
  countUnit: 'un',
  minStock: null,
  sectionId: null,
  dailyCount: false,
  deductOnSale: true,
  lots: [],
  counts: [],
  movements: [],
  oversales: [],
  components: [],
  ...overrides,
});

describe('PrismaStockRepository.listSnapshots (2026-11-08)', () => {
  it('consulta insumos ativos incluindo components de produtos ativos em uma busca só', async () => {
    const fake = new FakePrismaForStock();
    const repo = new PrismaStockRepository(fake as unknown as PrismaClient);

    await repo.listSnapshots();

    expect(fake.lastFindManyArgs).toMatchObject({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        deductOnSale: true,
        components: {
          where: { product: { active: true } },
          take: 1,
          select: { id: true },
        },
      },
    });
  });

  it('calcula soldInMenu verdadeiro só quando deductOnSale é true E compõe produto ativo', async () => {
    const fake = new FakePrismaForStock();
    fake.rows = [
      buildRow({
        id: 1,
        name: 'Refrigerante',
        deductOnSale: true,
        components: [{ id: 10 }],
      }),
      buildRow({
        id: 2,
        name: 'Guardanapo',
        deductOnSale: false,
        components: [{ id: 11 }],
      }),
      buildRow({
        id: 3,
        name: 'Calabresa fora de uso',
        deductOnSale: true,
        components: [],
      }),
      buildRow({
        id: 4,
        name: 'Detergente',
        deductOnSale: false,
        components: [],
      }),
    ];
    const repo = new PrismaStockRepository(fake as unknown as PrismaClient);

    const snapshots = await repo.listSnapshots();

    expect(
      snapshots.map((s) => ({ id: s.supplyId, soldInMenu: s.soldInMenu })),
    ).toEqual([
      { id: 1, soldInMenu: true },
      { id: 2, soldInMenu: false },
      { id: 3, soldInMenu: false },
      { id: 4, soldInMenu: false },
    ]);
  });
});
