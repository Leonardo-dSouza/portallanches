import { unitCostFromPaid } from './entry-cost.js';

describe('unitCostFromPaid', () => {
  it.each([
    ['25.00', '6', '4.1667'],
    ['39.90', '1', '39.9'],
    ['10.00', '120', '0.0833'],
    ['59.85', '1.5', '39.9'],
    ['0.00', '3', '0'],
  ])('R$ %s por %s un = %s', (paid, quantity, expected) => {
    expect(unitCostFromPaid(paid, quantity)).toBe(expected);
  });

  it('quantidade zero é erro com o valor', () => {
    expect(() => unitCostFromPaid('5.00', '0')).toThrow('Quantidade 0');
  });
});
