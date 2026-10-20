import type { ItemPriceRow, ProductPriceSummary } from './purchase-records.js';

/** Preço em décimos de milésimo inteiros ('19.9' → 199000), para comparar sem float. */
function priceUnits(price: string): bigint {
  const [integerPart, decimals = ''] = price.split('.');
  return (
    BigInt(integerPart) * 10_000n + BigInt(decimals.padEnd(4, '0').slice(0, 4))
  );
}

function byIssue(a: ItemPriceRow, b: ItemPriceRow): number {
  return (
    a.issuedAt.getTime() - b.issuedAt.getTime() ||
    a.invoiceId - b.invoiceId ||
    a.position - b.position
  );
}

function groupByProduct(rows: ItemPriceRow[]): ItemPriceRow[][] {
  const groups = new Map<string, ItemPriceRow[]>();
  for (const row of rows) {
    const key = `${row.vendorId}|${row.code}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()].map((group) => [...group].sort(byIssue));
}

/** Preço que vence a comparação (`beats(candidato, atual)`) entre todas as compras. */
function extremePrice(
  rows: ItemPriceRow[],
  beats: (candidate: bigint, current: bigint) => boolean,
): string {
  return rows.reduce(
    (best, row) =>
      beats(priceUnits(row.unitPrice), priceUnits(best)) ? row.unitPrice : best,
    rows[0].unitPrice,
  );
}

function summarizeProduct(purchases: ItemPriceRow[]): ProductPriceSummary {
  const last = purchases[purchases.length - 1];
  const earlier = purchases.filter((row) => row.invoiceId !== last.invoiceId);
  return {
    vendorId: last.vendorId,
    vendorName: last.vendorName,
    code: last.code,
    description: last.description,
    unit: last.unit,
    lastPrice: last.unitPrice,
    lastPurchasedAt: last.issuedAt.toISOString(),
    previousPrice: earlier.at(-1)?.unitPrice ?? null,
    minPrice: extremePrice(
      purchases,
      (candidate, current) => candidate < current,
    ),
    maxPrice: extremePrice(
      purchases,
      (candidate, current) => candidate > current,
    ),
    purchaseCount: new Set(purchases.map((row) => row.invoiceId)).size,
  };
}

/**
 * Resumo de preços por produto de cada mercado (mercado + código): último, anterior, menor,
 * maior e quantas notas. As linhas repetidas da mesma nota (bacon em 3 linhas) são uma compra.
 *
 * @example summarizePrices(rows)[0].lastPrice // '19.9'
 */
export function summarizePrices(rows: ItemPriceRow[]): ProductPriceSummary[] {
  return groupByProduct(rows)
    .map(summarizeProduct)
    .sort(
      (a, b) =>
        a.description.localeCompare(b.description, 'pt-BR') ||
        a.vendorName.localeCompare(b.vendorName, 'pt-BR'),
    );
}
