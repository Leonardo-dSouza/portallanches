import { formatCents, toCents } from '../common/money.js';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import { paidUnitCost } from './price-alert.js';
import type {
  BoardMarket,
  BoardPrice,
  BoardProduct,
  LinkedPurchase,
  SupplyPriceBoardRow,
} from './purchase-records.js';

/*
 * Quadro de Compras → Preços → Por insumo (2026-11-18): por insumo, quanto pagou por último, onde
 * saiu mais barato e, por marca, o último preço de cada mercado. Tudo por unidade do insumo
 * (preço da nota ÷ quantidade da embalagem da ligação).
 */

interface PricedPurchase extends LinkedPurchase {
  paidPerUnit: string;
}

/** Mais recente primeiro: data da nota e, no mesmo instante, a nota mais nova. */
const newestFirst = (a: LinkedPurchase, b: LinkedPurchase) =>
  b.issuedAt.getTime() - a.issuedAt.getTime() || b.invoiceId - a.invoiceId;

/** Mais barato primeiro; no empate, a compra mais recente. */
const cheapestFirst = (a: PricedPurchase, b: PricedPurchase) =>
  Number(a.paidPerUnit) - Number(b.paidPerUnit) || newestFirst(a, b);

function groupBy<T>(items: T[], keyOf: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}

/** Notas distintas: linhas repetidas da mesma nota são uma compra, como em Por produto. */
const invoiceCount = (purchases: LinkedPurchase[]) =>
  new Set(purchases.map((p) => p.invoiceId)).size;

const toBoardPrice = (p: PricedPurchase): BoardPrice => ({
  productName: p.productName,
  vendorName: p.vendorName,
  paidPerUnit: p.paidPerUnit,
  issuedAt: p.issuedAt.toISOString(),
});

/** Último preço de cada mercado da marca (compras já da mais nova para a mais antiga). */
function marketsOf(purchases: PricedPurchase[]): BoardMarket[] {
  const latest = groupBy(purchases, (p) => p.vendorName)
    .map((group) => ({
      purchase: group[0],
      purchaseCount: invoiceCount(group),
    }))
    .sort((a, b) => cheapestFirst(a.purchase, b.purchase));
  return latest.map(({ purchase, purchaseCount }, index) => ({
    vendorName: purchase.vendorName,
    paidPerUnit: purchase.paidPerUnit,
    issuedAt: purchase.issuedAt.toISOString(),
    purchaseCount,
    cheapest: index === 0,
  }));
}

/** Marcas do insumo: o nome sem acento e sem maiúscula junta; mostra o nome da compra mais nova. */
function productsOf(purchases: PricedPurchase[]): BoardProduct[] {
  return groupBy(purchases, (p) => toNeighborhoodKey(p.productName))
    .map((group) => ({
      productName: group[0].productName,
      markets: marketsOf(group),
    }))
    .sort(
      (a, b) =>
        Number(a.markets[0].paidPerUnit) - Number(b.markets[0].paidPerUnit),
    );
}

/** O mais barato entre o último preço de cada marca em cada mercado. */
function cheapestOf(purchases: PricedPurchase[]): PricedPurchase {
  const latestPerOffer = groupBy(
    purchases,
    (p) => `${toNeighborhoodKey(p.productName)}|${p.vendorName}`,
  ).map((group) => group[0]);
  return [...latestPerOffer].sort(cheapestFirst)[0];
}

function boardRowOf(purchases: PricedPurchase[]): SupplyPriceBoardRow {
  const [last] = purchases;
  const spentCents = purchases.reduce((sum, p) => sum + toCents(p.total), 0);
  return {
    supplyId: last.supplyId,
    supplyName: last.supplyName,
    countUnit: last.countUnit,
    last: toBoardPrice(last),
    cheapest: toBoardPrice(cheapestOf(purchases)),
    spent: formatCents(spentCents),
    purchaseCount: invoiceCount(purchases),
    products: productsOf(purchases),
  };
}

/**
 * Monta o quadro por insumo a partir das compras ligadas do período; insumos em ordem de nome.
 *
 * @example buildPriceBoard(purchases)[0].cheapest // { productName: 'Bacon Seara kg', vendorName: 'Assaí', … }
 */
export function buildPriceBoard(
  purchases: LinkedPurchase[],
): SupplyPriceBoardRow[] {
  const priced = [...purchases].sort(newestFirst).map((p) => ({
    ...p,
    paidPerUnit: paidUnitCost(p.unitPrice, p.baseQuantity),
  }));
  return groupBy(priced, (p) => String(p.supplyId))
    .map(boardRowOf)
    .sort((a, b) => a.supplyName.localeCompare(b.supplyName, 'pt-BR'));
}
