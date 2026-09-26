import { cmvPercent, computeCmv } from './cmv.js';

describe('computeCmv', () => {
  it('soma quantidade × custo e arredonda no centavo', () => {
    expect(
      computeCmv([
        { quantity: '0.036', unitCost: '39.9' },
        { quantity: '1', unitCost: '2.35' },
        { quantity: '2', unitCost: '0.0833' },
      ]),
    ).toEqual({ cmv: '3.95', complete: true });
  });

  it('meio centavo sobe (0,005 → 0,01)', () => {
    expect(computeCmv([{ quantity: '0.5', unitCost: '0.01' }]).cmv).toBe(
      '0.01',
    );
    expect(computeCmv([{ quantity: '1', unitCost: '0.0049' }]).cmv).toBe(
      '0.00',
    );
  });

  it('insumo sem custo fica fora da soma e marca o CMV como incompleto', () => {
    expect(
      computeCmv([
        { quantity: '1', unitCost: '5.99' },
        { quantity: '0.05', unitCost: null },
      ]),
    ).toEqual({ cmv: '5.99', complete: false });
  });

  it('sem componentes o CMV é zero', () => {
    expect(computeCmv([])).toEqual({ cmv: '0.00', complete: true });
  });
});

describe('cmvPercent', () => {
  it.each([
    ['7.42', '17.80', '41.7'],
    ['4.20', '10.00', '42.0'],
    ['0.05', '10.00', '0.5'],
    ['12.00', '10.00', '120.0'],
  ])('%s de %s = %s%%', (cmv, price, expected) => {
    expect(cmvPercent(cmv, price)).toBe(expected);
  });

  it('sem preço (ou preço zero) não há porcentagem', () => {
    expect(cmvPercent('7.42', null)).toBeNull();
    expect(cmvPercent('7.42', '0.00')).toBeNull();
  });
});
