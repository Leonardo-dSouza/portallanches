import { stockLeftOf } from './stock-left.js';

const balances = new Map([
  [30, 5000],
  [31, 0],
]);

describe('stockLeftOf', () => {
  it('unidades que dá para vender com o saldo do insumo com baixa', () => {
    expect(stockLeftOf([{ supplyId: 30, milli: 1000 }], balances)).toBe(5);
  });

  it('item com mais de um insumo com baixa vale o que acaba primeiro', () => {
    const lata2 = { supplyId: 30, milli: 2000 };
    expect(stockLeftOf([lata2, { supplyId: 31, milli: 1000 }], balances)).toBe(
      0,
    );
    expect(stockLeftOf([lata2], balances)).toBe(2);
  });

  it('insumo sem lote conta zero; item sem baixa não tem saldo', () => {
    expect(stockLeftOf([{ supplyId: 99, milli: 1000 }], balances)).toBe(0);
    expect(stockLeftOf([], balances)).toBeNull();
  });
});
