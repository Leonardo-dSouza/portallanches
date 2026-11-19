import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPurchaseRepository } from './prisma-purchase.repository.js';

class FakePrismaForPurchases {
  lastWhereInvoices: unknown;
  lastWhereItems: unknown;
  lastWhereHistory: unknown;
  lastWhereVendors: unknown;
  lastWhereSnapshot: unknown;
  lastUpsertArgs: unknown;
  lastDeleteArgs: unknown;

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
    findUnique: async (args: { where: { id: number } }) => {
      if (args.where.id === 1) return { id: 1 };
      return null;
    },
  };

  readonly supply = {
    findUnique: async (args: { where: { id: number } }) => {
      if (args.where.id === 10) return { id: 10 };
      return null;
    },
  };

  readonly vendorItemLink = {
    findMany: async () => [],
    upsert: async (args: unknown) => {
      this.lastUpsertArgs = args;
      return {
        id: 1,
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: new Prisma.Decimal('36'),
        label: 'cx 36',
      };
    },
    delete: async (args: {
      where: { vendorId_code: { vendorId: number; code: string } };
    }) => {
      this.lastDeleteArgs = args;
      if (args.where.vendorId_code.code === 'not-found') {
        throw new Prisma.PrismaClientKnownRequestError(
          'Record to delete does not exist',
          {
            code: 'P2025',
            clientVersion: '7.10.1',
          },
        );
      }
      return {};
    },
  };

  readonly supplyCostHistory = {
    findMany: async () => [],
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

describe('PrismaPurchaseRepository.saveItemLink e deleteItemLink', () => {
  it('lança 422 quando mercado não existe', async () => {
    const fake = new FakePrismaForPurchases();
    const repo = new PrismaPurchaseRepository(fake as unknown as PrismaClient);
    await expect(
      repo.saveItemLink(1, {
        vendorId: 999,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: null,
        productName: 'Hambúrguer Seara 56g',
      }),
    ).rejects.toThrow(
      new UnprocessableEntityException('Mercado 999 não encontrado'),
    );
  });

  it('lança 422 quando insumo não existe', async () => {
    const fake = new FakePrismaForPurchases();
    const repo = new PrismaPurchaseRepository(fake as unknown as PrismaClient);
    await expect(
      repo.saveItemLink(1, {
        vendorId: 1,
        code: '1128810',
        supplyId: 888,
        baseQuantity: '36',
        label: null,
        productName: 'Hambúrguer Seara 56g',
      }),
    ).rejects.toThrow(
      new UnprocessableEntityException('Insumo 888 não encontrado'),
    );
  });

  it('persiste upsert da ligação no banco', async () => {
    const fake = new FakePrismaForPurchases();
    const repo = new PrismaPurchaseRepository(fake as unknown as PrismaClient);
    const saved = await repo.saveItemLink(1, {
      vendorId: 1,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'cx 36',
      productName: 'Hambúrguer Seara 56g',
    });
    expect(saved).toEqual({
      id: 1,
      vendorId: 1,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'cx 36',
    });
    expect(fake.lastUpsertArgs).toMatchObject({
      where: { vendorId_code: { vendorId: 1, code: '1128810' } },
    });
  });

  it('deleteItemLink devolve true quando remove e false quando não existe (P2025)', async () => {
    const fake = new FakePrismaForPurchases();
    const repo = new PrismaPurchaseRepository(fake as unknown as PrismaClient);
    await expect(repo.deleteItemLink(1, '1128810')).resolves.toBe(true);
    await expect(repo.deleteItemLink(1, 'not-found')).resolves.toBe(false);
  });
});
