import { parseStockCountInput, parseStockEntryInput } from './stock-input.js';

describe('parseStockEntryInput', () => {
  it('aceita entrada em embalagem com validade', () => {
    expect(
      parseStockEntryInput({
        supplyId: 3,
        amount: 2,
        packageName: 'fardo',
        expiresOn: '2026-10-15',
      }),
    ).toEqual({
      supplyId: 3,
      amount: '2',
      packageName: 'fardo',
      expiresOn: '2026-10-15',
    });
  });

  it('sem embalagem e sem validade (ex.: sacolas)', () => {
    expect(
      parseStockEntryInput({ supplyId: 3, amount: '2.5', expiresOn: '' }),
    ).toMatchObject({ amount: '2.5', packageName: null, expiresOn: null });
  });

  it.each([
    [{ supplyId: 3, amount: 0 }, /"amount"/],
    [{ supplyId: 3, amount: 1, expiresOn: '15/10/2026' }, /15\/10\/2026/],
    [{ amount: 1 }, /"supplyId"/],
    [{ supplyId: 3, amount: 1, expiresOn: { dia: 15 } }, /"expiresOn"/],
  ])('rejeita %j', (body, message) => {
    expect(() => parseStockEntryInput(body)).toThrow(message);
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
