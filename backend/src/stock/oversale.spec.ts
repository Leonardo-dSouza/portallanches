import { settleOversales } from './oversale.js';

const pending = [
  { id: 1, orderId: 10, milli: 2000 },
  { id: 2, orderId: null, milli: 3000 },
];

describe('settleOversales', () => {
  it('a entrada cobre as vendas além do estoque, da mais antiga para a mais nova', () => {
    expect(settleOversales(pending, 12000)).toEqual([
      { id: 1, orderId: 10, milli: 2000, leftMilli: 0 },
      { id: 2, orderId: null, milli: 3000, leftMilli: 0 },
    ]);
  });

  it('entrada menor que a diferença cobre o que der e o resto continua pendente', () => {
    expect(settleOversales(pending, 3000)).toEqual([
      { id: 1, orderId: 10, milli: 2000, leftMilli: 0 },
      { id: 2, orderId: null, milli: 1000, leftMilli: 2000 },
    ]);
  });

  it('sem pendência não cobre nada', () => {
    expect(settleOversales([], 12000)).toEqual([]);
  });
});
