import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { listLastPrices, listSupplyPrices } from './prisma-supply-prices.js';
import { RecordingPurchasePrisma } from './purchase-prisma.fixture.js';

const decimal = (value: string) => ({ toString: () => value });

function lastPriceLink(vendorId: number, code: string, supplyId: number) {
  return {
    vendorId,
    code,
    supplyId,
    baseQuantity: decimal('1'),
    label: null,
    productName: null,
    supply: { unitCost: decimal('10') },
  };
}

function lastPriceItem(vendorId: number, code: string, issuedAt: string) {
  return {
    code,
    description: `ITEM ${code}`,
    quantity: decimal('1'),
    unit: 'un',
    unitPrice: decimal('10'),
    invoice: {
      id: vendorId * 1000 + Number(code),
      issuedAt: new Date(issuedAt),
      vendorId,
      vendor: { nickname: `Fornecedor ${vendorId}`, legalName: 'RAZAO' },
    },
  };
}

// 2026-11-23: o OR com uma entrada por ligação (198) levava o Postgres da produção ao teto de 768 MB e a
// rota caía. O banco filtra por IN; o casamento exato fornecedor|código continua no JS.
describe('listLastPrices sem OR por ligação', () => {
  it('listLastPrices filtra por IN, sem OR', async () => {
    const fake = new RecordingPurchasePrisma({
      links: [
        lastPriceLink(1, '100', 10),
        lastPriceLink(2, '100', 20),
        lastPriceLink(1, '200', 30),
      ],
      items: [],
    });

    await listLastPrices(fake.asPrisma());

    expect(fake.itemWheres).toEqual([
      {
        outsideBusiness: false,
        code: { in: ['100', '200'] },
        invoice: { vendorId: { in: [1, 2] }, expense: { canceledAt: null } },
      },
    ]);
  });

  it('listLastPrices ignora o código ligado só em outro fornecedor', async () => {
    const fake = new RecordingPurchasePrisma({
      links: [lastPriceLink(1, '100', 10), lastPriceLink(2, '200', 20)],
      items: [
        lastPriceItem(2, '100', '2026-11-20T10:00:00Z'),
        lastPriceItem(1, '100', '2026-11-14T10:00:00Z'),
      ],
    });

    const lastPrices = await listLastPrices(fake.asPrisma());

    expect(Object.keys(lastPrices)).toEqual(['10']);
    expect(lastPrices[10].issuedAt).toBe('2026-11-14T10:00:00.000Z');
  });

  it('listLastPrices pega a nota mais nova entre as ligações do insumo', async () => {
    const fake = new RecordingPurchasePrisma({
      links: [lastPriceLink(1, '100', 10), lastPriceLink(2, '300', 10)],
      items: [
        lastPriceItem(2, '300', '2026-11-20T10:00:00Z'),
        lastPriceItem(1, '100', '2026-11-14T10:00:00Z'),
      ],
    });

    const lastPrices = await listLastPrices(fake.asPrisma());

    expect(lastPrices[10].issuedAt).toBe('2026-11-20T10:00:00.000Z');
    expect(lastPrices[10].vendorName).toBe('Fornecedor 2');
  });

  it('listLastPrices sem ligação não lê as notas', async () => {
    const fake = new RecordingPurchasePrisma({ links: [], items: [] });

    expect(await listLastPrices(fake.asPrisma())).toEqual({});
    expect(fake.itemWheres).toEqual([]);
  });
});

describe('prisma-supply-prices', () => {
  it('listSupplyPrices busca todas as compras do insumo mais nova primeiro', async () => {
    const prisma = {
      vendorItemLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            vendorId: 1,
            code: '100',
            supplyId: 10,
            baseQuantity: { toString: () => '36' },
            label: 'cx 36',
            productName: null,
            supply: { unitCost: { toString: () => '1.2444' } },
          },
        ]),
      },
      supplyCostHistory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      purchaseInvoiceItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            description: 'HAMB FAROESTE 36X56G',
            quantity: { toString: () => '2' },
            unit: 'cx',
            unitPrice: { toString: () => '44.89' },
            code: '100',
            invoice: {
              id: 1,
              issuedAt: new Date('2026-11-14T10:00:00Z'),
              vendorId: 1,
              vendor: { nickname: 'Assaí', legalName: 'SENDAS DISTRIBUIDORA' },
            },
          },
        ]),
      },
    } as unknown as PrismaClient;

    const rows = await listSupplyPrices(prisma, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      invoiceId: 1,
      issuedAt: '2026-11-14T10:00:00.000Z',
      vendorName: 'Assaí',
      // Ligação antiga sem produto: mostra a descrição da nota.
      productName: 'HAMB FAROESTE 36X56G',
      description: 'HAMB FAROESTE 36X56G',
      quantity: '2',
      unit: 'cx',
      unitPrice: '44.89',
      label: 'cx 36',
      baseQuantity: '36',
      paidPerUnit: '1.2469',
      basePerUnit: '1.2444',
      diffPercent: '0.2',
      above: true,
    });
  });

  it('listLastPrices traz compra mais recente sem N+1', async () => {
    const prisma = {
      vendorItemLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            vendorId: 1,
            code: '100',
            supplyId: 10,
            baseQuantity: { toString: () => '36' },
            label: 'cx 36',
            supply: { unitCost: { toString: () => '1.2444' } },
          },
        ]),
      },
      purchaseInvoiceItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            description: 'HAMB FAROESTE',
            quantity: { toString: () => '2' },
            unit: 'cx',
            unitPrice: { toString: () => '44.89' },
            code: '100',
            invoice: {
              id: 1,
              issuedAt: new Date('2026-11-14T10:00:00Z'),
              vendorId: 1,
              vendor: { nickname: null, legalName: 'SENDAS DISTRIBUIDORA' },
            },
          },
        ]),
      },
      supplyCostHistory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;

    const lastPrices = await listLastPrices(prisma);
    expect(lastPrices).toEqual({
      10: {
        issuedAt: '2026-11-14T10:00:00.000Z',
        vendorName: 'SENDAS DISTRIBUIDORA',
        paidPerUnit: '1.2469',
        diffPercent: '0.2',
        above: true,
      },
    });
  });
  it('insumo sem custo base: base e diferença nulas, nunca zero', async () => {
    const prisma = {
      vendorItemLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            vendorId: 1,
            code: '100',
            supplyId: 10,
            baseQuantity: { toString: () => '36' },
            label: 'cx 36',
            supply: { unitCost: null },
          },
        ]),
      },
      supplyCostHistory: { findMany: vi.fn().mockResolvedValue([]) },
      purchaseInvoiceItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            description: 'HAMB FAROESTE 36X56G',
            quantity: { toString: () => '2' },
            unit: 'cx',
            unitPrice: { toString: () => '44.89' },
            code: '100',
            invoice: {
              id: 1,
              issuedAt: new Date('2026-11-14T10:00:00Z'),
              vendorId: 1,
              vendor: { nickname: 'Assaí', legalName: 'SENDAS DISTRIBUIDORA' },
            },
          },
        ]),
      },
    } as unknown as PrismaClient;

    const [row] = await listSupplyPrices(prisma, 10);

    expect(row).toMatchObject({
      paidPerUnit: '1.2469',
      basePerUnit: null,
      diffPercent: null,
      above: false,
    });
  });
});
