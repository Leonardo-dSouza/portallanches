import type { ProductCategory } from '../api/types';
import {
  addonTargets,
  moveCategory,
  selectableCategories,
} from './category-list';

const category = (
  id: number,
  sortOrder: number,
  active = true,
): ProductCategory => ({
  id,
  name: `Categoria ${id}`,
  sortOrder,
  active,
  importLocked: false,
  addonCategoryId: null,
});

// Fora de ordem de propósito: a ordem vale pelo `sortOrder`, não pela posição na lista.
const CATEGORIES = [category(3, 3), category(1, 1), category(2, 2, false)];

describe('moveCategory', () => {
  it('subir troca de lugar com a de cima (inativas contam)', () => {
    expect(moveCategory(CATEGORIES, 3, -1)).toEqual([1, 3, 2]);
  });

  it('descer troca de lugar com a de baixo', () => {
    expect(moveCategory(CATEGORIES, 1, 1)).toEqual([2, 1, 3]);
  });

  it('na ponta não há para onde ir', () => {
    expect(moveCategory(CATEGORIES, 1, -1)).toBeNull();
    expect(moveCategory(CATEGORIES, 3, 1)).toBeNull();
  });
});

describe('selectableCategories', () => {
  it('só as ativas, na ordem do cardápio', () => {
    expect(selectableCategories(CATEGORIES, null).map((c) => c.id)).toEqual([
      1, 3,
    ]);
  });

  it('mantém a inativa que já é a categoria do item', () => {
    expect(selectableCategories(CATEGORIES, 2).map((c) => c.id)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe('addonTargets', () => {
  const tradicional = { ...category(1, 1), addonCategoryId: 3 };
  const artesanal = category(2, 2);
  const adicionais = category(3, 3);
  const acai = category(7, 4);
  const all = [tradicional, artesanal, adicionais, acai];

  it('oferece as categorias que podem ser lista de adicionais, sem a própria', () => {
    expect(addonTargets(all, artesanal).map((c) => c.id)).toEqual([3, 7]);
  });

  it('a categoria que já é lista de adicionais de outra não ganha adicionais', () => {
    expect(addonTargets(all, adicionais)).toEqual([]);
  });
});
