import type { ProductCategory } from '../api/types';
import {
  formatCategoryPv,
  parseCategoryPercentages,
} from './category-pv-values';

describe('parseCategoryPercentages', () => {
  it('ambos vazios viram null e null', () => {
    expect(parseCategoryPercentages('', '')).toEqual({
      ok: true,
      value: { fixedCostPercent: null, profitPercent: null },
    });
    expect(parseCategoryPercentages('   ', '   ')).toEqual({
      ok: true,
      value: { fixedCostPercent: null, profitPercent: null },
    });
  });

  it('os dois preenchidos viram formato da API com ponto', () => {
    expect(parseCategoryPercentages('41,07', '16')).toEqual({
      ok: true,
      value: { fixedCostPercent: '41.07', profitPercent: '16' },
    });
    expect(parseCategoryPercentages(' 40 ', ' 15,5 ')).toEqual({
      ok: true,
      value: { fixedCostPercent: '40', profitPercent: '15.5' },
    });
  });

  it('só custo fixo preenchido dá erro', () => {
    const result = parseCategoryPercentages('41,07', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Informe os dois percentuais/i);
    }
  });

  it('só lucro desejado preenchido dá erro', () => {
    const result = parseCategoryPercentages('', '16');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Informe os dois percentuais/i);
    }
  });

  it.each([
    ['abc', '16', /Custo fixo inválido/],
    ['41,07', 'xyz', /Lucro desejado inválido/],
    ['101', '16', /Custo fixo inválido/],
    ['41,07', '-1', /Lucro desejado inválido/],
    ['41,075', '16', /Custo fixo inválido/],
  ])('rejeita valores inválidos %s e %s', (fixed, profit, pattern) => {
    const result = parseCategoryPercentages(fixed, profit);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(pattern);
    }
  });
});

describe('formatCategoryPv', () => {
  it('mostra 41,07% + 16% quando os dois estão definidos', () => {
    const category = {
      fixedCostPercent: '41.07',
      profitPercent: '16',
    } as ProductCategory;
    expect(formatCategoryPv(category)).toBe('41,07% + 16%');
  });

  it('mostra vírgula decimal e mantém inteiros sem zeros inúteis', () => {
    const category = {
      fixedCostPercent: '40',
      profitPercent: '15.5',
    } as ProductCategory;
    expect(formatCategoryPv(category)).toBe('40% + 15,5%');
  });

  it('mostra sem PV quando um ou os dois são nulos', () => {
    expect(
      formatCategoryPv({
        fixedCostPercent: null,
        profitPercent: null,
      } as ProductCategory),
    ).toBe('sem PV');
    expect(
      formatCategoryPv({
        fixedCostPercent: '41.07',
        profitPercent: null,
      } as ProductCategory),
    ).toBe('sem PV');
    expect(
      formatCategoryPv({
        fixedCostPercent: null,
        profitPercent: '16',
      } as ProductCategory),
    ).toBe('sem PV');
  });
});
