import { sortItemsByCategory } from './item-order.js';
import type { OrderItemInput } from './order-item-input.js';
import type { SaleProduct } from './order-pricing.js';

const item = (productId: number): OrderItemInput => ({
  productId,
  quantity: 1,
  note: null,
  addons: [],
});

const product = (
  id: number,
  categoryId: number,
  categorySortOrder: number,
): SaleProduct => ({
  id,
  name: `Produto ${id}`,
  menuNumber: null,
  categoryId,
  categoryName: `Categoria ${categoryId}`,
  categorySortOrder,
  addonCategoryId: null,
  isBundle: false,
  salePrice: '7.00',
  active: true,
  components: [],
});

// Lanche (ordem 1), açaí (2) e refrigerante (3), como o usuário quer a comanda.
const byId = new Map(
  [
    product(9, 1, 1),
    product(10, 1, 1),
    product(80, 7, 2),
    product(60, 4, 3),
  ].map((p) => [p.id, p]),
);

const idsOf = (items: OrderItemInput[]) => items.map((i) => i.productId);

describe('sortItemsByCategory', () => {
  it('põe os itens na ordem das categorias: lanches, açaí e bebidas', () => {
    const sorted = sortItemsByCategory([item(60), item(80), item(9)], byId);
    expect(idsOf(sorted)).toEqual([9, 80, 60]);
  });

  it('mantém a ordem digitada dentro da mesma categoria', () => {
    const sorted = sortItemsByCategory([item(10), item(60), item(9)], byId);
    expect(idsOf(sorted)).toEqual([10, 9, 60]);
  });

  it('agrupa categorias que empatam na ordem pelo id da categoria', () => {
    const tied = new Map(byId).set(70, product(70, 2, 1));
    const sorted = sortItemsByCategory([item(70), item(9), item(70)], tied);
    expect(idsOf(sorted)).toEqual([9, 70, 70]);
  });

  it('deixa produto desconhecido no fim (o preço recusa o id depois)', () => {
    const sorted = sortItemsByCategory([item(999), item(60)], byId);
    expect(idsOf(sorted)).toEqual([60, 999]);
  });

  it('não altera a lista recebida', () => {
    const items = [item(60), item(9)];
    sortItemsByCategory(items, byId);
    expect(idsOf(items)).toEqual([60, 9]);
  });
});
