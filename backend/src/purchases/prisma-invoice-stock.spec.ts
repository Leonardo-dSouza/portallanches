import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { NewLot } from '../stock/stock-repository.js';
import {
  findInvoiceStockTarget,
  saveInvoiceStockEntry,
} from './prisma-invoice-stock.js';

describe('prisma-invoice-stock', () => {
  it('findInvoiceStockTarget busca dados e monta itens com links', async () => {
    const prisma = {
      purchaseInvoice: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          issuedAt: new Date('2026-11-14T10:00:00Z'),
          stockEnteredAt: null,
          vendorId: 2,
          items: [
            {
              id: 10,
              code: '1128810',
              quantity: { toString: () => '2' },
              unitPrice: { toString: () => '44.89' },
              outsideBusiness: false,
            },
          ],
        }),
      },
      vendorItemLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            code: '1128810',
            supplyId: 5,
            baseQuantity: { toString: () => '36' },
            supply: { deductOnSale: true },
          },
        ]),
      },
    } as unknown as PrismaClient;

    const target = await findInvoiceStockTarget(prisma, 1);
    expect(target).not.toBeNull();
    expect(target?.items[0]).toEqual({
      id: 10,
      invoiceId: 1,
      quantity: '2',
      unitPrice: '44.89',
      outsideBusiness: false,
      link: { supplyId: 5, baseQuantity: '36', deductOnSale: true },
    });
  });

  it('saveInvoiceStockEntry lança ConflictException se a nota já foi marcada', async () => {
    const tx = {
      purchaseInvoice: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: vi.fn((fn) => fn(tx)),
    } as unknown as PrismaClient;

    const lot: NewLot = {
      supplyId: 5,
      quantity: '72',
      expiresOn: null,
      createdById: 1,
      unitCost: '1.2469',
      invoiceItemId: 10,
    };

    await expect(saveInvoiceStockEntry(prisma, 1, 1, [lot])).rejects.toThrow(
      ConflictException,
    );
  });
});
