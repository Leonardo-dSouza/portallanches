import { describe, expect, it } from 'vitest';
import { buildPriceBoard } from './price-board.js';
import type { LinkedPurchase } from './purchase-records.js';

const bacon = (
  overrides: Partial<LinkedPurchase> & { invoiceId: number },
): LinkedPurchase => ({
  supplyId: 10,
  supplyName: 'Bacon',
  countUnit: 'kg',
  productName: 'Bacon Seara kg',
  vendorId: 2,
  vendorName: 'Assaí',
  issuedAt: new Date('2026-11-11T12:00:00Z'),
  position: 1,
  unitPrice: '36.90',
  baseQuantity: '1',
  total: '36.90',
  ...overrides,
});

/** Bacon Seara no Assaí (2 compras) e no Spani, Bacon Aurora no Frios & Cia, hambúrguer em caixa. */
const PURCHASES: LinkedPurchase[] = [
  bacon({ invoiceId: 11, total: '73.80' }),
  bacon({
    invoiceId: 5,
    issuedAt: new Date('2026-11-01T12:00:00Z'),
    unitPrice: '38.00',
    total: '38.00',
  }),
  bacon({
    invoiceId: 3,
    productName: 'bacon seara KG',
    vendorId: 3,
    vendorName: 'Spani',
    issuedAt: new Date('2026-10-28T12:00:00Z'),
    unitPrice: '38.50',
    total: '77.00',
  }),
  bacon({
    invoiceId: 8,
    productName: 'Bacon Aurora manta kg',
    vendorId: 8,
    vendorName: 'Frios & Cia',
    issuedAt: new Date('2026-11-05T12:00:00Z'),
    unitPrice: '41.90',
    total: '41.90',
  }),
  {
    supplyId: 24,
    supplyName: 'Hambúrguer 56g',
    countUnit: 'un',
    productName: 'Hambúrguer Seara 56g',
    vendorId: 2,
    vendorName: 'Assaí',
    invoiceId: 12,
    issuedAt: new Date('2026-11-10T12:00:00Z'),
    position: 4,
    unitPrice: '38.90',
    baseQuantity: '36',
    total: '77.80',
  },
];

describe('buildPriceBoard', () => {
  it('um insumo por linha, em ordem de nome, com o último pago e o mais barato', () => {
    const [baconRow, burgerRow] = buildPriceBoard(PURCHASES);

    expect(baconRow).toMatchObject({
      supplyId: 10,
      supplyName: 'Bacon',
      countUnit: 'kg',
      last: {
        productName: 'Bacon Seara kg',
        vendorName: 'Assaí',
        paidPerUnit: '36.9',
        issuedAt: '2026-11-11T12:00:00.000Z',
      },
      cheapest: { productName: 'Bacon Seara kg', vendorName: 'Assaí' },
      spent: '230.70',
      purchaseCount: 4,
    });
    expect(burgerRow.last.paidPerUnit).toBe('1.0806');
  });

  it('marcas com o último preço de cada mercado, o mais barato da marca marcado', () => {
    const [baconRow] = buildPriceBoard(PURCHASES);

    expect(baconRow.products).toEqual([
      {
        productName: 'Bacon Seara kg',
        markets: [
          {
            vendorName: 'Assaí',
            paidPerUnit: '36.9',
            issuedAt: '2026-11-11T12:00:00.000Z',
            purchaseCount: 2,
            cheapest: true,
          },
          {
            vendorName: 'Spani',
            paidPerUnit: '38.5',
            issuedAt: '2026-10-28T12:00:00.000Z',
            purchaseCount: 1,
            cheapest: false,
          },
        ],
      },
      {
        productName: 'Bacon Aurora manta kg',
        markets: [
          {
            vendorName: 'Frios & Cia',
            paidPerUnit: '41.9',
            issuedAt: '2026-11-05T12:00:00.000Z',
            purchaseCount: 1,
            cheapest: true,
          },
        ],
      },
    ]);
  });

  it('preço empatado entre mercados: o mais barato é o da compra mais recente', () => {
    const [row] = buildPriceBoard([
      bacon({ invoiceId: 1, issuedAt: new Date('2026-11-01T12:00:00Z') }),
      bacon({ invoiceId: 2, vendorId: 3, vendorName: 'Spani' }),
    ]);

    expect(row.cheapest.vendorName).toBe('Spani');
  });

  it('linhas repetidas da mesma nota são uma compra (como em Por produto)', () => {
    const [row] = buildPriceBoard([
      bacon({ invoiceId: 7, total: '20.00' }),
      bacon({ invoiceId: 7, total: '15.00' }),
      bacon({ invoiceId: 9, issuedAt: new Date('2026-11-01T12:00:00Z') }),
    ]);

    expect(row.purchaseCount).toBe(2);
    expect(row.products[0].markets[0].purchaseCount).toBe(2);
    expect(row.spent).toBe('71.90');
  });

  it('mercados diferentes com o mesmo nome não se juntam (agrupa pelo id)', () => {
    const [row] = buildPriceBoard([
      bacon({ invoiceId: 1, vendorId: 4, vendorName: 'Atacadão' }),
      bacon({
        invoiceId: 2,
        vendorId: 12,
        vendorName: 'Atacadão',
        issuedAt: new Date('2026-11-01T12:00:00Z'),
        unitPrice: '30.00',
      }),
    ]);

    expect(row.products[0].markets).toHaveLength(2);
    expect(row.cheapest.paidPerUnit).toBe('30');
  });

  it('duas linhas da mesma nota: o último pago não depende da ordem do banco', () => {
    const first = bacon({ invoiceId: 7, position: 1, unitPrice: '36.90' });
    const second = bacon({ invoiceId: 7, position: 2, unitPrice: '39.90' });

    const [inOrder] = buildPriceBoard([first, second]);
    const [reversed] = buildPriceBoard([second, first]);

    expect(inOrder.last.paidPerUnit).toBe('39.9');
    expect(reversed.last.paidPerUnit).toBe('39.9');
    expect(reversed.products[0].markets[0].paidPerUnit).toBe('39.9');
  });

  it('sem compras ligadas, quadro vazio', () => {
    expect(buildPriceBoard([])).toEqual([]);
  });
});
