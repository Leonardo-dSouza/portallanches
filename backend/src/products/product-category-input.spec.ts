import { BadRequestException } from '@nestjs/common';
import {
  parseAddonCategoryChoice,
  parseCategoryInput,
  parseCategoryOrder,
} from './product-category-input.js';

describe('parseCategoryInput', () => {
  it('apara o nome e lê o ativo', () => {
    expect(parseCategoryInput({ name: ' Combos ', active: true })).toEqual({
      name: 'Combos',
      active: true,
      fixedCostPercent: undefined,
      profitPercent: undefined,
    });
  });

  it('lê percentuais de PV válidos ou null nos dois', () => {
    expect(
      parseCategoryInput({
        name: 'Tradicional',
        fixedCostPercent: '41.07',
        profitPercent: 16,
      }),
    ).toMatchObject({
      fixedCostPercent: '41.07',
      profitPercent: '16',
    });

    expect(
      parseCategoryInput({
        name: 'Tradicional',
        fixedCostPercent: null,
        profitPercent: null,
      }),
    ).toMatchObject({
      fixedCostPercent: null,
      profitPercent: null,
    });
  });

  it('rejeita quando apenas um percentual é informado (400)', () => {
    expect(() =>
      parseCategoryInput({ name: 'Tradicional', fixedCostPercent: '41.07' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCategoryInput({ name: 'Tradicional', profitPercent: 16 }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCategoryInput({
        name: 'Tradicional',
        fixedCostPercent: '41.07',
        profitPercent: null,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCategoryInput({
        name: 'Tradicional',
        fixedCostPercent: null,
        profitPercent: 16,
      }),
    ).toThrow(BadRequestException);
  });

  it('sem active no corpo a categoria nasce ativa', () => {
    expect(parseCategoryInput({ name: 'Porções' }).active).toBe(true);
  });

  it('rejeita nome vazio citando o valor', () => {
    expect(() => parseCategoryInput({ name: '  ' })).toThrow(/"name"/);
  });
});

describe('parseCategoryOrder', () => {
  it('lê a lista de ids na ordem nova', () => {
    expect(parseCategoryOrder({ ids: [3, 1, 2] })).toEqual([3, 1, 2]);
  });

  it('rejeita lista vazia, id inválido e id repetido', () => {
    expect(() => parseCategoryOrder({ ids: [] })).toThrow(/"ids"/);
    expect(() => parseCategoryOrder({ ids: [1, 'x'] })).toThrow(/"ids\[1\]"/);
    expect(() => parseCategoryOrder({ ids: [1, 2, 1] })).toThrow(/repetido: 1/);
  });
});

describe('parseAddonCategoryChoice', () => {
  it('lê o id da categoria de adicionais ou null (sem adicionais)', () => {
    expect(parseAddonCategoryChoice({ addonCategoryId: 3 })).toBe(3);
    expect(parseAddonCategoryChoice({ addonCategoryId: null })).toBeNull();
  });

  it('recusa ausente ou inválido citando o valor', () => {
    expect(() => parseAddonCategoryChoice({})).toThrow(/"addonCategoryId"/);
    expect(() => parseAddonCategoryChoice({ addonCategoryId: 'x' })).toThrow(
      /"x"/,
    );
  });
});
