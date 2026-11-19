import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { listLastPrices, listSupplyPrices } from './prisma-supply-prices.js';

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
