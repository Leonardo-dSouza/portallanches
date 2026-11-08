import { describe, expect, it } from 'vitest';
import { categoriesOf, visibleItems, quantityInOrder } from './menu-grid';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

const item = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null = null,
): MenuItem => ({
  id,
  name,
  categoryName,
  categoryId: 1,
  menuNumber,
  addonCategoryId: null,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '10.00',
  stockLeft: null,
  removables: [],
});

const line = (productId: number, quantity: number): DraftLine => ({
  id: productId,
  productId,
  name: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  unitPrice: '17.80',
  quantity,
  note: '',
  choice: null,
  addons: [],
  removals: [],
});

const MENU: MenuItem[] = [
  item(1, 'X Salada', 'Tradicional', 9),
  item(2, 'X Bacon', 'Tradicional', 10),
  item(3, 'X Salada Art.', 'Artesanal', 9),
  item(4, 'Coca Cola 600ml', 'Refrigerantes'),
  item(5, 'Coca Cola 2l', 'Refrigerantes'),
];

describe('categoriesOf', () => {
  it('retorna categorias na ordem de aparição, sem repetição', () => {
    expect(categoriesOf(MENU)).toEqual(['Tradicional', 'Artesanal', 'Refrigerantes']);
  });

  it('retorna lista vazia para menu vazio', () => {
    expect(categoriesOf([])).toEqual([]);
  });
});

describe('visibleItems', () => {
  it('sem busca, filtra pela categoria ativa', () => {
    const items = visibleItems(MENU, '', 'Tradicional');
    expect(items.map((i) => i.name)).toEqual(['X Salada', 'X Bacon']);
  });

  it('com busca, retorna resultado do searchMenu de todas as categorias', () => {
    const items = visibleItems(MENU, 'coca', 'Tradicional');
    expect(items.map((i) => i.name)).toEqual(['Coca Cola 600ml', 'Coca Cola 2l']);
  });

  it('busca ignora a categoria ativa e mostra todos os resultados', () => {
    const items = visibleItems(MENU, 'x salada', 'Refrigerantes');
    expect(items.map((i) => i.name)).toEqual(['X Salada', 'X Salada Art.']);
  });

  it('busca vazia (espaços) trata como sem busca', () => {
    const items = visibleItems(MENU, '   ', 'Artesanal');
    expect(items.map((i) => i.name)).toEqual(['X Salada Art.']);
  });
});

describe('quantityInOrder', () => {
  it('soma as quantidades do produto nas linhas', () => {
    const lines = [line(1, 2), line(1, 3)];
    expect(quantityInOrder(lines, 1)).toBe(5);
  });

  it('ignora outros produtos', () => {
    const lines = [line(1, 2), line(2, 1)];
    expect(quantityInOrder(lines, 1)).toBe(2);
  });

  it('retorna zero quando o produto não está na comanda', () => {
    expect(quantityInOrder([line(1, 1)], 99)).toBe(0);
  });

  it('retorna zero para comanda vazia', () => {
    expect(quantityInOrder([], 1)).toBe(0);
  });
});
