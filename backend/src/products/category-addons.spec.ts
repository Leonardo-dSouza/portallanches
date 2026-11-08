import { UnprocessableEntityException } from '@nestjs/common';
import { assertAddonTarget } from './category-addons.js';
import type { CategoryRecord } from './product-category-repository.js';

const category = (
  id: number,
  name: string,
  addonCategoryId: number | null = null,
  choiceCategoryId: number | null = null,
): CategoryRecord => ({
  id,
  name,
  nameKey: name.toLowerCase(),
  sortOrder: id,
  active: true,
  addonCategoryId,
  choiceCategoryId,
});

// Tradicional já usa os Adicionais; Artesanal ainda não tem.
const ALL = [
  category(1, 'Tradicional', 3),
  category(2, 'Artesanal'),
  category(3, 'Adicionais'),
  category(7, 'Açaí'),
  category(8, 'Adicionais do açaí'),
];

describe('assertAddonTarget', () => {
  it('aceita apontar para uma categoria de adicionais ou tirar (null)', () => {
    expect(() => assertAddonTarget(2, 3, ALL)).not.toThrow();
    expect(() => assertAddonTarget(7, 8, ALL)).not.toThrow();
    expect(() => assertAddonTarget(1, null, ALL)).not.toThrow();
  });

  it('recusa a própria categoria e id inexistente, citando o valor', () => {
    expect(() => assertAddonTarget(2, 2, ALL)).toThrow(/própria categoria/);
    expect(() => assertAddonTarget(2, 99, ALL)).toThrow(/99/);
  });

  it('um nível só: alvo que tem adicionais, ou categoria que já é alvo, são recusados', () => {
    expect(() => assertAddonTarget(2, 1, ALL)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertAddonTarget(3, 8, ALL)).toThrow(
      /já é a lista de adicionais/,
    );
  });

  it('a lista de escolha (Pão) não vira adicionais nem ganha adicionais (2026-11-08)', () => {
    const withBread = [
      category(1, 'Tradicional'),
      category(2, 'Artesanal', 3, 12),
      category(3, 'Adicionais'),
      category(12, 'Pão'),
    ];
    expect(() => assertAddonTarget(1, 12, withBread)).toThrow(
      '"Pão" é lista de escolha obrigatória',
    );
    expect(() => assertAddonTarget(12, 3, withBread)).toThrow(
      'Categoria 12 é a escolha obrigatória de "Artesanal"',
    );
  });
});
