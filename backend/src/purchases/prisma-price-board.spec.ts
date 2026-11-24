import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { listLinkedPurchases } from './prisma-price-board.js';
import { RecordingPurchasePrisma } from './purchase-prisma.fixture.js';

const RANGE = {
  from: new Date('2026-10-01T03:00:00Z'),
  until: new Date('2026-12-01T03:00:00Z'),
};

function prismaWith(links: unknown[], items: unknown[]) {
  return {
    vendorItemLink: { findMany: vi.fn().mockResolvedValue(links) },
    purchaseInvoiceItem: { findMany: vi.fn().mockResolvedValue(items) },
  } as unknown as PrismaClient;
}

const decimal = (value: string) => ({ toString: () => value });

function boardLink(vendorId: number, code: string, supplyId: number) {
  return {
    vendorId,
    code,
    productName: `Produto ${code}`,
    baseQuantity: decimal('1'),
    supply: { id: supplyId, name: `Insumo ${supplyId}`, countUnit: 'un' },
  };
}

function boardItem(vendorId: number, code: string, invoiceId: number) {
  return {
    code,
    description: `ITEM ${code}`,
    position: 1,
    unitPrice: decimal('10'),
    total: decimal('10'),
    invoice: {
      id: invoiceId,
      issuedAt: new Date('2026-11-14T10:00:00Z'),
      vendorId,
      vendor: { nickname: `Fornecedor ${vendorId}`, legalName: 'RAZAO' },
    },
  };
}

// 2026-11-23: o OR com uma entrada por ligação levava o Postgres da produção ao teto de 768 MB. O banco
// filtra por IN; o casamento exato fornecedor|código continua no JS.
describe('listLinkedPurchases sem OR por ligação', () => {
  it('listLinkedPurchases filtra por IN, sem OR, e mantém o período', async () => {
    const fake = new RecordingPurchasePrisma({
      links: [
        boardLink(1, '100', 10),
        boardLink(2, '100', 20),
        boardLink(1, '200', 30),
      ],
      items: [],
    });

    await listLinkedPurchases(fake.asPrisma(), RANGE);

    expect(fake.itemWheres).toEqual([
      {
        outsideBusiness: false,
        code: { in: ['100', '200'] },
        invoice: {
          issuedAt: { gte: RANGE.from, lt: RANGE.until },
          vendorId: { in: [1, 2] },
          expense: { canceledAt: null },
        },
      },
    ]);
  });

  it('listLinkedPurchases ignora o código ligado só em outro fornecedor', async () => {
    const fake = new RecordingPurchasePrisma({
      links: [boardLink(1, '100', 10), boardLink(2, '200', 20)],
      items: [boardItem(2, '100', 21), boardItem(1, '100', 11)],
    });

    const purchases = await listLinkedPurchases(fake.asPrisma(), RANGE);

    expect(purchases.map((p) => [p.invoiceId, p.supplyId])).toEqual([[11, 10]]);
  });
});

describe('listLinkedPurchases', () => {
  it('junta a compra à ligação: insumo, produto com a marca e embalagem', async () => {
    const prisma = prismaWith(
      [
        {
          vendorId: 1,
          code: '1128810',
          productName: 'Bacon Seara kg',
          baseQuantity: decimal('1'),
          supply: { id: 10, name: 'Bacon', countUnit: 'kg' },
        },
        {
          vendorId: 2,
          code: '3210',
          productName: null,
          baseQuantity: decimal('1'),
          supply: { id: 10, name: 'Bacon', countUnit: 'kg' },
        },
      ],
      [
        {
          code: '1128810',
          description: 'BACON SEARA PD kg',
          position: 3,
          unitPrice: decimal('36.90'),
          total: decimal('73.80'),
          invoice: {
            id: 11,
            issuedAt: new Date('2026-11-11T12:00:00Z'),
            vendorId: 1,
            vendor: { nickname: 'Assaí', legalName: 'SENDAS' },
          },
        },
        {
          code: '3210',
          description: 'BACON SEARA PEDACO DEF ATC kg',
          position: 1,
          unitPrice: decimal('38.50'),
          total: decimal('38.50'),
          invoice: {
            id: 3,
            issuedAt: new Date('2026-10-28T12:00:00Z'),
            vendorId: 2,
            vendor: { nickname: null, legalName: 'SPANI ATACADISTA' },
          },
        },
      ],
    );

    const purchases = await listLinkedPurchases(prisma, RANGE);

    expect(purchases[0]).toEqual({
      supplyId: 10,
      supplyName: 'Bacon',
      countUnit: 'kg',
      productName: 'Bacon Seara kg',
      vendorId: 1,
      vendorName: 'Assaí',
      invoiceId: 11,
      issuedAt: new Date('2026-11-11T12:00:00Z'),
      position: 3,
      unitPrice: '36.90',
      baseQuantity: '1',
      total: '73.80',
    });
    // Ligação antiga sem produto: a descrição da nota.
    expect(purchases[1].productName).toBe('BACON SEARA PEDACO DEF ATC kg');
  });

  it('sem ligação nenhuma não lê as notas', async () => {
    const readItems = vi.fn();
    const prisma = {
      vendorItemLink: { findMany: vi.fn().mockResolvedValue([]) },
      purchaseInvoiceItem: { findMany: readItems },
    } as unknown as PrismaClient;
    expect(await listLinkedPurchases(prisma, RANGE)).toEqual([]);
    expect(readItems).not.toHaveBeenCalled();
  });
});
