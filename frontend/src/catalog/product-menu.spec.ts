import type { Product, ProductCategory } from '../api/types';
import {
  cmvLevel,
  countByCategory,
  EMPTY_MENU_FILTER,
  filterMenu,
  matchesMenuQuery,
  menuSections,
} from './product-menu';

const CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'Tradicional', sortOrder: 1, active: true },
  { id: 2, name: 'Artesanal', sortOrder: 2, active: true },
  { id: 3, name: 'Adicionais', sortOrder: 3, active: true },
];

const product = (overrides: Partial<Product>): Product => ({
  id: 1,
  categoryId: 1,
  categoryName: 'Tradicional',
  menuNumber: 9,
  name: 'X Salada',
  description: 'Hambúrguer 56g, queijo, alface, tomate',
  salePrice: '17.80',
  active: true,
  components: [],
  cmv: '7.44',
  cmvComplete: true,
  cmvPercent: '41.8',
  ...overrides,
});

const MENU = [
  product({}),
  product({ id: 2, categoryId: 2, name: 'X Salada' }),
  product({ id: 3, menuNumber: 10, name: 'X Bacon Salada', active: false }),
  product({
    id: 4,
    categoryId: 3,
    menuNumber: null,
    name: 'Add bacon',
    description: null,
  }),
];

describe('busca e filtro do cardápio', () => {
  it.each([
    ['', true],
    ['9', true],
    ['90', false],
    ['salada', true],
    ['ALFACE', true],
    ['hamburguer', true],
    ['bacon', false],
  ])('%j encontra o X Salada? %s', (query, found) => {
    expect(matchesMenuQuery(MENU[0], query)).toBe(found);
  });

  it('esconde inativos, filtra categoria e mantém a ordem', () => {
    expect(filterMenu(MENU, EMPTY_MENU_FILTER).map((p) => p.id)).toEqual([
      1, 2, 4,
    ]);
    expect(
      filterMenu(MENU, {
        ...EMPTY_MENU_FILTER,
        categoryId: 1,
        showInactive: true,
      }).map((p) => p.id),
    ).toEqual([1, 3]);
    expect(
      filterMenu(MENU, { ...EMPTY_MENU_FILTER, query: 'bacon' }).map(
        (p) => p.id,
      ),
    ).toEqual([4]);
  });

  it('conta por categoria ignorando a categoria escolhida', () => {
    const counts = countByCategory(MENU, {
      ...EMPTY_MENU_FILTER,
      categoryId: 3,
    });
    expect([...counts]).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
  });

  it('agrupa por categoria na ordem das categorias, sem seções vazias', () => {
    const sections = menuSections([MENU[3], MENU[0]], CATEGORIES);
    expect(
      sections.map((s) => [s.category.name, s.products.map((p) => p.id)]),
    ).toEqual([
      ['Tradicional', [1]],
      ['Adicionais', [4]],
    ]);
  });
});

describe('cmvLevel', () => {
  it.each([
    ['41.9', 'ok'],
    ['42.5', 'ok'],
    ['46.0', 'high'],
    ['50.0', 'high'],
    ['61.2', 'over'],
    [null, 'none'],
  ] as const)('%s → %s', (percent, level) => {
    expect(cmvLevel(percent)).toBe(level);
  });
});
