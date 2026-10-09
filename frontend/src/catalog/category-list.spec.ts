import type { ProductCategory } from '../api/types';
import { moveCategory, selectableCategories } from './category-list';

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
