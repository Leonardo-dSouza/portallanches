import { formatCents, toCents } from '../common/money.js';
import type {
  AnalyticsItemRow,
  AnalyticsOrderRow,
  MenuLancheRow,
} from './analytics-source.js';

export interface ProductSales {
  productId: number;
  /** Nome da venda mais recente (o cadastro pode ter mudado depois). */
  name: string;
  categoryName: string;
  quantity: number;
  revenue: string;
}

export interface LancheSales {
  productId: number;
  name: string;
  menuNumber: number;
  categoryName: string;
  quantity: number;
}

export interface CategorySales {
  categoryName: string;
  quantity: number;
  revenue: string;
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

/**
 * Itens mais vendidos por quantidade (desempate pelo faturamento), com o preço da época.
 *
 * @example topProducts(orders, 10)[0] // { name: 'X Salada', quantity: 31, revenue: '551.80', ... }
 */
export function topProducts(
  orders: AnalyticsOrderRow[],
  limit: number,
): ProductSales[] {
  return [...tallyBy(itemsOf(orders), (item) => item.productId).values()]
    .sort((a, b) => b.quantity - a.quantity || b.cents - a.cents)
    .slice(0, limit)
    .map(({ quantity, cents, last }) => ({
      productId: last.productId,
      name: last.productName,
      categoryName: last.categoryName,
      quantity,
      revenue: formatCents(cents),
    }));
}

/**
 * Lanches ativos do cardápio do que menos vendeu ao que mais (os zerados primeiro), para
 * decidir o que sai do cardápio.
 *
 * @example leastSoldLanches(orders, lanches, 10)[0] // { name: 'X Tudo', quantity: 0, ... }
 */
export function leastSoldLanches(
  orders: AnalyticsOrderRow[],
  lanches: MenuLancheRow[],
  limit: number,
): LancheSales[] {
  const sold = tallyBy(itemsOf(orders), (item) => item.productId);
  return lanches
    .map((lanche) => ({
      productId: lanche.id,
      name: lanche.name,
      menuNumber: lanche.menuNumber,
      categoryName: lanche.categoryName,
      quantity: sold.get(lanche.id)?.quantity ?? 0,
    }))
    .sort((a, b) => a.quantity - b.quantity || a.menuNumber - b.menuNumber)
    .slice(0, limit);
}

/** @example salesByCategory(orders)[0] // { categoryName: 'Tradicional', quantity: 80, revenue: '1420.00' } */
export function salesByCategory(orders: AnalyticsOrderRow[]): CategorySales[] {
  return [...tallyBy(itemsOf(orders), (item) => item.categoryName).values()]
    .sort((a, b) => b.cents - a.cents)
    .map(({ quantity, cents, last }) => ({
      categoryName: last.categoryName,
      quantity,
      revenue: formatCents(cents),
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
