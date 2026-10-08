import { formatCents, toCents } from '../common/money.js';
import type {
  AnalyticsItemRow,
  AnalyticsOrderRow,
  CategoryOrderRow,
} from './analytics-source.js';

export interface ProductSales {
  productId: number;
  /** Nome da venda mais recente (o cadastro pode ter mudado depois). */
  name: string;
  categoryName: string;
  quantity: number;
  revenue: string;
}

export interface CategorySales {
  categoryName: string;
  quantity: number;
  revenue: string;
  /** Todos os itens da categoria, do que mais saiu ao que menos (abre ao clicar na tela). */
  products: ProductSales[];
}

const itemsOf = (orders: AnalyticsOrderRow[]): AnalyticsItemRow[] =>
  orders.flatMap((order) => order.items);

const itemCents = (item: AnalyticsItemRow): number =>
  item.quantity * toCents(item.unitPrice);

interface Tally {
  quantity: number;
  cents: number;
  last: AnalyticsItemRow;
}

/** Quantidade e faturamento (centavos) por chave, guardando a última linha vista. */
function tallyBy(
  items: AnalyticsItemRow[],
  keyOf: (item: AnalyticsItemRow) => string | number,
): Map<string | number, Tally> {
  const tallies = new Map<string | number, Tally>();
  for (const item of items) {
    const current = tallies.get(keyOf(item));
    tallies.set(keyOf(item), {
      quantity: (current?.quantity ?? 0) + item.quantity,
      cents: (current?.cents ?? 0) + itemCents(item),
      last: item,
    });
  }
  return tallies;
}

/** Itens por quantidade (desempate pelo faturamento), com o preço da época. */
function rankProducts(items: AnalyticsItemRow[]): ProductSales[] {
  return [...tallyBy(items, (item) => item.productId).values()]
    .sort((a, b) => b.quantity - a.quantity || b.cents - a.cents)
    .map(({ quantity, cents, last }) => ({
      productId: last.productId,
      name: last.productName,
      categoryName: last.categoryName,
      quantity,
      revenue: formatCents(cents),
    }));
}

/**
 * Lanches mais vendidos por quantidade (desempate pelo faturamento). Lanche = item com número
 * no cardápio (tradicional e artesanal); bebidas, açaí e adicionais não têm número e ficam só
 * nas vendas por categoria (pedido do usuário: a Skol lata aparecia como "lanche").
 *
 * @example topProducts(orders, 10)[0] // { name: 'X Salada', quantity: 31, revenue: '551.80', ... }
 */
export function topProducts(
  orders: AnalyticsOrderRow[],
  limit: number,
): ProductSales[] {
  const lanches = itemsOf(orders).filter((item) => item.menuNumber !== null);
  return rankProducts(lanches).slice(0, limit);
}

/** Posição no cardápio; categoria que saiu do cadastro fica depois de todas. */
function positionOf(
  categoryName: string,
  categoryOrder: CategoryOrderRow[],
): number {
  const found = categoryOrder.find((c) => c.name === categoryName);
  return found ? found.sortOrder : Number.MAX_SAFE_INTEGER;
}

/**
 * Vendas por categoria na ordem do cardápio, só as que venderam; cada uma com os seus itens.
 * Categoria que não está mais no cadastro vai para o fim, pelo faturamento.
 *
 * @example salesByCategory(orders, categoryOrder)[0].products[0].name // 'X Salada'
 */
export function salesByCategory(
  orders: AnalyticsOrderRow[],
  categoryOrder: CategoryOrderRow[],
): CategorySales[] {
  const items = itemsOf(orders);
  const position = (name: string) => positionOf(name, categoryOrder);
  return [...tallyBy(items, (item) => item.categoryName).values()]
    .sort(
      (a, b) =>
        position(a.last.categoryName) - position(b.last.categoryName) ||
        b.cents - a.cents,
    )
    .map(({ quantity, cents, last }) => ({
      categoryName: last.categoryName,
      quantity,
      revenue: formatCents(cents),
      products: rankProducts(
        items.filter((item) => item.categoryName === last.categoryName),
      ),
    }));
}

/** Itens vendidos e pedidos sem itens (importados da planilha, que só tinham o valor). */
export function itemsSummary(orders: AnalyticsOrderRow[]): {
  itemsSold: number;
  ordersWithoutItems: number;
} {
  return {
    itemsSold: itemsOf(orders).reduce((sum, item) => sum + item.quantity, 0),
    ordersWithoutItems: orders.filter((o) => o.items.length === 0).length,
  };
}
