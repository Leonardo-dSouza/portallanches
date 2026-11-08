import { UnprocessableEntityException } from '@nestjs/common';
import { assertChoiceTarget } from './category-choice.js';
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

// Tradicional já pede o Pão; Artesanal ainda não.
const ALL = [
  category(1, 'Tradicional', 3, 12),
  category(2, 'Artesanal', 3),
  category(3, 'Adicionais'),
  category(12, 'Pão'),
];

describe('assertChoiceTarget', () => {
  it('aceita apontar para a lista do pão, de mais de uma categoria, ou tirar (null)', () => {
    expect(() => assertChoiceTarget(2, 12, ALL)).not.toThrow();
    expect(() => assertChoiceTarget(2, null, ALL)).not.toThrow();
  });

  it('recusa a própria categoria e a que não existe', () => {
    expect(() => assertChoiceTarget(2, 2, ALL)).toThrow(
      'não pode pedir escolha da própria categoria',
    );
    expect(() => assertChoiceTarget(2, 99, ALL)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('recusa alvo com adicionais ou escolha própria', () => {
    expect(() => assertChoiceTarget(2, 1, ALL)).toThrow(
      '"Tradicional" tem adicionais ou escolha própria',
    );
  });

  it('recusa alvo que é lista de adicionais', () => {
    expect(() => assertChoiceTarget(2, 3, ALL)).toThrow(
      '"Adicionais" já é a lista de adicionais de "Tradicional"',
    );
  });

  it('a lista do pão e a de adicionais não pedem escolha', () => {
    const withSauces = [...ALL, category(13, 'Molhos')];
    expect(() => assertChoiceTarget(12, 13, withSauces)).toThrow(
      'Categoria 12 já é a escolha de "Tradicional"',
    );
    expect(() => assertChoiceTarget(3, 13, withSauces)).toThrow(
      'Categoria 3 é a lista de adicionais de "Tradicional"',
    );
  });
});
