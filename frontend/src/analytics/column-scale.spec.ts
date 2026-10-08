import { formatTick, niceCeiling } from './column-scale';

describe('niceCeiling', () => {
  it('arredonda o topo do eixo para um número redondo logo acima do maior valor', () => {
    expect(niceCeiling(1210.5)).toBe(1500);
    expect(niceCeiling(474.93)).toBe(500);
    expect(niceCeiling(66.5)).toBe(80);
    expect(niceCeiling(2000)).toBe(2000);
    expect(niceCeiling(0)).toBe(1);
  });
});

describe('formatTick', () => {
  it('reais inteiros com ponto de milhar', () => {
    expect(formatTick(1500)).toBe('R$ 1.500');
    expect(formatTick(80)).toBe('R$ 80');
  });
});
