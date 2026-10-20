import type { ItemPriceRow } from './purchase-records.js';
import { summarizePrices } from './price-summary.js';

function row(fields: Partial<ItemPriceRow>): ItemPriceRow {
  return {
    vendorId: 1,
    vendorName: 'Assaí',
    code: '1128810',
    description: 'BACON SEARA PD kg',
    unit: 'Kg',
    unitPrice: '19.9',
    invoiceId: 1,
    position: 1,
    issuedAt: new Date('2026-10-01T20:00:00Z'),
    ...fields,
  };
}

describe('summarizePrices', () => {
  it('último e anterior pela data da nota, mesmo fora de ordem', () => {
    const [bacon] = summarizePrices([
      row({
        invoiceId: 3,
        unitPrice: '21.5',
        issuedAt: new Date('2026-10-18T20:00:00Z'),
      }),
      row({
        invoiceId: 1,
        unitPrice: '19.9',
        issuedAt: new Date('2026-10-01T20:00:00Z'),
      }),
      row({
        invoiceId: 2,
        unitPrice: '20.4',
        issuedAt: new Date('2026-10-10T20:00:00Z'),
      }),
    ]);
    expect(bacon).toMatchObject({
      lastPrice: '21.5',
      lastPurchasedAt: '2026-10-18T20:00:00.000Z',
      previousPrice: '20.4',
      purchaseCount: 3,
    });
  });

  it('as linhas repetidas da mesma nota contam como uma compra', () => {
    const [bacon] = summarizePrices([
      row({ invoiceId: 1, position: 2 }),
      row({ invoiceId: 1, position: 3 }),
      row({ invoiceId: 1, position: 4 }),
    ]);
    expect(bacon).toMatchObject({ purchaseCount: 1, previousPrice: null });
  });

  it('o anterior vem de outra nota, não de outra linha da última', () => {
    const [bacon] = summarizePrices([
      row({
        invoiceId: 1,
        unitPrice: '18',
        issuedAt: new Date('2026-10-01T20:00:00Z'),
      }),
      row({
        invoiceId: 2,
        position: 1,
        unitPrice: '19.9',
        issuedAt: new Date('2026-10-18T20:00:00Z'),
      }),
      row({
        invoiceId: 2,
        position: 2,
        unitPrice: '19.9',
        issuedAt: new Date('2026-10-18T20:00:00Z'),
      }),
    ]);
    expect(bacon).toMatchObject({ lastPrice: '19.9', previousPrice: '18' });
  });

  it('menor e maior pelo valor, não pela ordem do texto', () => {
    const [bacon] = summarizePrices([
      row({ invoiceId: 1, unitPrice: '9.5' }),
      row({ invoiceId: 2, unitPrice: '10.25' }),
      row({ invoiceId: 3, unitPrice: '9.75' }),
    ]);
    expect(bacon).toMatchObject({ minPrice: '9.5', maxPrice: '10.25' });
  });

  it('o mesmo código em mercados diferentes é outro produto', () => {
    const summaries = summarizePrices([
      row({ vendorId: 1, vendorName: 'Assaí', unitPrice: '19.9' }),
      row({
        vendorId: 2,
        vendorName: 'Spani',
        unitPrice: '22.9',
        invoiceId: 9,
      }),
    ]);
    expect(summaries.map((s) => [s.vendorName, s.lastPrice])).toEqual([
      ['Assaí', '19.9'],
      ['Spani', '22.9'],
    ]);
  });

  it('descrição e unidade da última compra; lista pelo nome do produto', () => {
    const summaries = summarizePrices([
      row({ code: '2', description: 'REF COLA 350ML', unit: 'UN' }),
      row({
        invoiceId: 1,
        description: 'BACON PD kg',
        unit: 'KG',
        issuedAt: new Date('2026-10-01T20:00:00Z'),
      }),
      row({
        invoiceId: 2,
        description: 'BACON SEARA PD kg',
        unit: 'Kg',
        issuedAt: new Date('2026-10-18T20:00:00Z'),
      }),
    ]);
    expect(summaries.map((s) => [s.description, s.unit])).toEqual([
      ['BACON SEARA PD kg', 'Kg'],
      ['REF COLA 350ML', 'UN'],
    ]);
  });
});
