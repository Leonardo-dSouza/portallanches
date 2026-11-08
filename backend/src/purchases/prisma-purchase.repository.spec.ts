import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPurchaseRepository } from './prisma-purchase.repository.js';

class FakePrismaForPurchases {
  lastWhereInvoices: unknown;
  lastWhereItems: unknown;
  lastWhereHistory: unknown;
  lastWhereVendors: unknown;
  lastWhereSnapshot: unknown;

  readonly purchaseInvoice = {
    findMany: async (args: { where: unknown }) => {
      this.lastWhereInvoices = args.where;
      return [];
    },
    findUnique: async (args: { where: unknown }) => {
      this.lastWhereSnapshot = args.where;
      return null;
    },
  };

  readonly purchaseInvoiceItem = {
    findMany: async (args: { where: unknown }) => {
      this.lastWhereItems = args.where;
      this.lastWhereHistory = args.where;
      return [];
    },
  };

  readonly vendor = {
    findMany: async (args: { select: { invoices: { where: unknown } } }) => {
      this.lastWhereVendors = args.select.invoices.where;
      return [];
    },
  };
}

describe('PrismaPurchaseRepository ignora gastos cancelados (2026-11-08)', () => {
  it('filtra expense: { canceledAt: null } em notas, preços, histórico e mercados', async () => {
    const fake = new FakePrismaForPurchases();
    const repo = new PrismaPurchaseRepository(fake as unknown as PrismaClient);
    const range = {
      from: new Date('2026-10-01T00:00:00Z'),
      until: new Date('2026-11-01T00:00:00Z'),
    };

    await repo.listInvoices(range);
    expect(fake.lastWhereInvoices).toMatchObject({
      expense: { canceledAt: null },
    });

    await repo.listItemPrices(range);
    expect(fake.lastWhereItems).toMatchObject({
      invoice: { expense: { canceledAt: null } },
    });

    await repo.listProductHistory(1, '1001', range);
    expect(fake.lastWhereHistory).toMatchObject({
      invoice: { expense: { canceledAt: null } },
    });

    await repo.listVendors(range);
    expect(fake.lastWhereVendors).toMatchObject({
      expense: { canceledAt: null },
    });

    await repo.findOutsideSnapshot(12);
    expect(fake.lastWhereSnapshot).toMatchObject({
      expense: { canceledAt: null },
    });
  });
});
