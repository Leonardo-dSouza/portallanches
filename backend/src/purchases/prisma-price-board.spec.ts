import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { listLinkedPurchases } from './prisma-price-board.js';

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
      vendorName: 'Assaí',
      invoiceId: 11,
      issuedAt: new Date('2026-11-11T12:00:00Z'),
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
