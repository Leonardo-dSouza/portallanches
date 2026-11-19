import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import {
  buildHistoryMap,
  buildLinksMap,
  type RawInvoiceRow,
  toInvoiceRowWithAlerts,
} from './prisma-invoice-rows.js';

describe('prisma-invoice-rows', () => {
  it('buildLinksMap monta mapa com chave vendorId|code', () => {
    const map = buildLinksMap([
      {
        vendorId: 1,
        code: '100',
        baseQuantity: new Prisma.Decimal('36'),
        label: 'cx 36',
        productName: 'Hambúrguer Seara 56g',
        supply: {
          id: 10,
          name: 'Hambúrguer',
          unitCost: new Prisma.Decimal('1.2444'),
        },
      },
    ]);
    expect(map.get('1|100')).toEqual({
      supplyId: 10,
      supplyName: 'Hambúrguer',
      baseQuantity: '36',
      label: 'cx 36',
      productName: 'Hambúrguer Seara 56g',
      unitCost: '1.2444',
    });
  });

  it('buildHistoryMap agrupa históricos por supplyId', () => {
    const map = buildHistoryMap([
      {
        supplyId: 10,
        oldUnitCost: new Prisma.Decimal('1.0000'),
        newUnitCost: new Prisma.Decimal('1.2444'),
        changeSet: { createdAt: new Date('2026-10-01') },
      },
    ]);
    expect(map.get(10)).toHaveLength(1);
    expect(map.get(10)?.[0].newUnitCost).toBe('1.2444');
  });

  it('toInvoiceRowWithAlerts inclui stockEnteredAt e stockEnteredByName', () => {
    const row: RawInvoiceRow = {
      id: 1,
      expenseId: 10,
      vendorId: 1,
      number: 100,
      series: 1,
      issuedAt: new Date('2026-11-14T12:00:00Z'),
      amountDue: new Prisma.Decimal('100.00'),
      stockEnteredAt: new Date('2026-11-14T14:30:00Z'),
      stockEnteredBy: { name: 'Admin Lanches' },
      vendor: { legalName: 'Mercado S/A', nickname: 'Mercado' },
      expense: {
        amount: new Prisma.Decimal('100.00'),
        closing: { businessDate: new Date('2026-11-14T00:00:00Z') },
      },
      items: [],
    };
    const res = toInvoiceRowWithAlerts(row, new Map(), new Map());
    expect(res.stockEnteredAt).toBe('2026-11-14T14:30:00.000Z');
    expect(res.stockEnteredByName).toBe('Admin Lanches');
  });
  it('toInvoiceRowWithAlerts manda o id de cada item (a entrada no estoque escolhe por ele)', () => {
    const row: RawInvoiceRow = {
      id: 1,
      expenseId: 10,
      vendorId: 1,
      number: 100,
      series: 1,
      issuedAt: new Date('2026-11-14T12:00:00Z'),
      amountDue: new Prisma.Decimal('100.00'),
      stockEnteredAt: null,
      stockEnteredBy: null,
      vendor: { legalName: 'Mercado S/A', nickname: 'Mercado' },
      expense: {
        amount: new Prisma.Decimal('100.00'),
        closing: { businessDate: new Date('2026-11-14T00:00:00Z') },
      },
      items: [
        {
          id: 77,
          position: 3,
          code: '73648',
          description: 'HAMB FAROESTE 36X56G',
          quantity: new Prisma.Decimal('2'),
          unit: 'Cx',
          unitPrice: new Prisma.Decimal('44.89'),
          total: new Prisma.Decimal('89.78'),
          outsideBusiness: false,
        },
      ],
    };
    const res = toInvoiceRowWithAlerts(row, new Map(), new Map());
    expect(res.items[0]).toMatchObject({ id: 77, position: 3 });
  });
});
