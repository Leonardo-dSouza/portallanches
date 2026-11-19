import { describe, expect, it } from 'vitest';
import type { ProductCostView } from '../api/cost-types';
import {
  divisorOf,
  fixedCostAmount,
  formatPercentText,
  gapPoints,
  rulerOf,
  sortForCategory,
  splitOf,
  unroundedPv,
} from './price-split';

const view = (overrides: Partial<ProductCostView>): ProductCostView => ({
  id: 1,
  name: 'X Salada',
  categoryId: 1,
  menuNumber: 9,
  salePrice: '17.60',
  cmv: '7.68',
  cmvComplete: true,
  cmvPercent: '43.6',
  pv: '17.90',
  ifoodPv: '21.80',
  profit: '2.69',
  marginPercent: '15.3',
  profitTarget: '16',
  ownProfitTarget: false,
  targetStatus: 'near',
  belowTarget: false,
  ...overrides,
});

describe('divisorOf', () => {
  it('é o que sobra do preço depois do custo fixo e do lucro', () => {
    expect(divisorOf('41.07', '16')).toBe('0.4293');
    expect(divisorOf('41.07', '10')).toBe('0.4893');
  });
});

describe('rulerOf', () => {
  it('reparte R$ 10 entre insumos, custo fixo e lucro somando 10', () => {
    expect(rulerOf('41.07', '16')).toEqual({
      supplies: '4.29',
      fixed: '4.11',
      profit: '1.60',
      suppliesPercent: '42.93',
      divisor: '0.4293',
    });
  });
});

describe('splitOf', () => {
  it('fatias do preço de hoje e a marca da meta', () => {
    const split = splitOf(view({}))!;
    expect(split.supplies).toBeCloseTo(7.68 / 17.6);
    expect(split.profit).toBeCloseTo(2.69 / 17.6);
    expect(split.fixed).toBeCloseTo((17.6 - 7.68 - 2.69) / 17.6);
    expect(split.loss).toBe(0);
    expect(split.targetMark).toBeCloseTo(0.84);
  });

  it('prejuízo: a barra vira o custo total e o que o preço não cobre fica no fim', () => {
    const split = splitOf(
      view({ salePrice: '3.50', cmv: '3.47', profit: '-1.40' }),
    )!;
    expect(split.profit).toBe(0);
    expect(split.loss).toBeGreaterThan(0);
    expect(split.supplies + split.fixed + split.loss).toBeCloseTo(1);
    expect(split.targetMark).toBeNull();
  });

  it('categoria sem meta: custo e sobra, sem custo fixo nem marca', () => {
    const split = splitOf(
      view({ profit: '9.92', profitTarget: null, targetStatus: null }),
    )!;
    expect(split.fixed).toBe(0);
    expect(split.targetMark).toBeNull();
  });

  it('sem preço não tem barra', () => {
    expect(splitOf(view({ salePrice: null, profit: null }))).toBeNull();
  });
});

describe('fixedCostAmount', () => {
  it('é o preço menos os insumos menos o lucro', () => {
    expect(fixedCostAmount(view({}))).toBe('7.23');
    expect(fixedCostAmount(view({ profit: null }))).toBeNull();
  });
});

describe('unroundedPv', () => {
  it('mostra a divisão antes de subir para os 10 centavos', () => {
    expect(unroundedPv('8.48', '0.4893')).toBe('17.33');
    expect(unroundedPv('7.68', '0.4293')).toBe('17.88');
  });
});

describe('gapPoints', () => {
  it('quantos pontos o lucro está abaixo da meta, com vírgula', () => {
    expect(gapPoints('9.0', '10')).toBe('1');
    expect(gapPoints('15.3', '16')).toBe('0,7');
  });
});

describe('formatPercentText', () => {
  it('vírgula decimal e sem zeros sobrando', () => {
    expect(formatPercentText('41.07')).toBe('41,07');
    expect(formatPercentText('16.00')).toBe('16');
    expect(formatPercentText('12.50')).toBe('12,5');
  });
});

describe('sortForCategory', () => {
  it('filtra a categoria e ordena pelo número do cardápio, sem número no fim', () => {
    const sorted = sortForCategory(
      [
        view({ id: 3, menuNumber: null, name: 'Bacon' }),
        view({ id: 2, menuNumber: 10 }),
        view({ id: 1, menuNumber: 9 }),
        view({ id: 4, categoryId: 2 }),
      ],
      1,
    );
    expect(sorted.map((v) => v.id)).toEqual([1, 2, 3]);
  });
});
