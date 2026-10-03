import { parseStockCountInput, parseStockEntryBatch } from './stock-input.js';

describe('parseStockEntryBatch', () => {
  it('objeto solto (formato antigo) vira lista de 1, sem valor pago', () => {
    expect(
      parseStockEntryBatch({
        supplyId: 3,
        amount: 2,
        packageName: 'fardo',
        expiresOn: '2026-10-15',
      }),
    ).toEqual([
      {
        supplyId: 3,
        amount: '2',
        packageName: 'fardo',
        expiresOn: '2026-10-15',
        paid: null,
        paidPer: 'total',
      },
    ]);
  });

  it('lê a compra inteira com valor pago por linha', () => {
    const items = parseStockEntryBatch({
      items: [
        { supplyId: 3, amount: 2, packageName: 'fardo', paid: 50 },
        { supplyId: 4, amount: '1.5', paid: '39.90', paidPer: 'unit' },
      ],
    });
    expect(items.map((i) => [i.paid, i.paidPer])).toEqual([
      ['50.00', 'total'],
      ['39.90', 'unit'],
    ]);
  });

  it('sem embalagem e sem validade (ex.: sacolas)', () => {
    expect(
      parseStockEntryBatch({ supplyId: 3, amount: '2.5', expiresOn: '' })[0],
    ).toMatchObject({ amount: '2.5', packageName: null, expiresOn: null });
  });

  it.each([
    [{ supplyId: 3, amount: 0 }, /"items\[0\]\.amount"/],
    [{ supplyId: 3, amount: 1, expiresOn: '15/10/2026' }, /15\/10\/2026/],
    [{ amount: 1 }, /"items\[0\]\.supplyId"/],
    [{ supplyId: 3, amount: 1, expiresOn: { dia: 15 } }, /"expiresOn"/],
    [{ supplyId: 3, amount: 1, paid: '50,00' }, /"items\[0\]\.paid"/],
    [{ supplyId: 3, amount: 1, paidPer: 'fardo' }, /items\[0\]\.paidPer/],
    [{ items: [] }, /"items"/],
  ])('rejeita %j', (body, message) => {
    expect(() => parseStockEntryBatch(body)).toThrow(message);
  });

  it('erro na 2ª linha aponta o índice', () => {
    expect(() =>
      parseStockEntryBatch({
        items: [
          { supplyId: 3, amount: 1 },
          { supplyId: 4, amount: -1 },
        ],
      }),
    ).toThrow(/items\[1\]\.amount/);
  });
});

describe('parseStockCountInput', () => {
  it('quantidade só em COUNTED, e zero vale', () => {
    expect(
      parseStockCountInput({
        items: [
          { supplyId: 1, status: 'COUNTED', quantity: 0 },
          { supplyId: 2, status: 'NOT_COUNTED', quantity: 99 },
          { supplyId: 3, status: 'NEEDS_PURCHASE' },
        ],
      }),
    ).toEqual([
      { supplyId: 1, status: 'COUNTED', quantity: '0' },
      { supplyId: 2, status: 'NOT_COUNTED', quantity: null },
      { supplyId: 3, status: 'NEEDS_PURCHASE', quantity: null },
    ]);
  });

  it.each([
    [{ items: [] }, /"items"/],
    [{ items: [{ supplyId: 1, status: 'COUNTED' }] }, /items\[0\]\.quantity/],
    [{ items: [{ supplyId: 1, status: 'TALVEZ' }] }, /items\[0\]\.status/],
    [
      {
        items: [
          { supplyId: 1, status: 'NOT_COUNTED' },
          { supplyId: 1, status: 'NEEDS_PURCHASE' },
        ],
      },
      /Insumo 1 aparece mais de uma vez/,
    ],
  ])('rejeita %j', (body, message) => {
    expect(() => parseStockCountInput(body)).toThrow(message);
  });
});
