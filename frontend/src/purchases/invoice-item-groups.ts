import type { InvoiceItem } from '../api/invoice-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { ProductPurchase } from '../api/purchase-types';
import { sumQuantities } from '../api/quantity';
import type { Money } from '../api/types';

/** Linha da tela: uma ou mais linhas iguais da nota, com a quantidade e o total somados. */
export interface InvoiceItemGroup {
  key: string;
  /** As linhas da nota que ela junta: a marca de fora vale para todas. */
  positions: number[];
  code: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: Money;
}

interface SummedLine {
  quantity: string;
  total: Money;
}

/** Linhas com a mesma chave juntas, na ordem em que cada grupo apareceu. */
function linesByKey<T>(lines: T[], keyOf: (line: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const key = keyOf(line);
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return [...groups.values()];
}

const summedFields = (lines: SummedLine[]): SummedLine => ({
  quantity: sumQuantities(lines.map((line) => line.quantity)),
  total: centsToMoney(
    lines.reduce((sum, line) => sum + moneyToCents(line.total), 0),
  ),
});

function groupOf(items: InvoiceItem[]): InvoiceItemGroup {
  const [first] = items;
  return {
    key: String(first.position),
    positions: items.map((item) => item.position),
    code: first.code,
    description: first.description,
    unit: first.unit,
    unitPrice: first.unitPrice,
    ...summedFields(items),
  };
}

/**
 * Junta as linhas iguais da nota (pedido do usuário, 2026-10-30): o cupom repete o produto a cada
 * unidade passada no caixa. Igual = mesmo código, unidade e preço. A marca de fora entra na
 * conta: uma nota gravada com só parte das linhas marcada não perde a marca.
 *
 * @example groupInvoiceItems(oitoLatas, new Set())[0].quantity // '8'
 */
export function groupInvoiceItems(
  items: InvoiceItem[],
  outside: ReadonlySet<number>,
): InvoiceItemGroup[] {
  return linesByKey(
    items,
    (item) =>
      `${item.code}|${item.unit}|${item.unitPrice}|${outside.has(item.position)}`,
  ).map(groupOf);
}

/**
 * Compras do produto com as linhas da mesma nota juntas, no histórico do produto.
 *
 * @example groupProductPurchases(tresLinhasDoBacon)[0].quantity // '3.728'
 */
export function groupProductPurchases(
  rows: ProductPurchase[],
): ProductPurchase[] {
  return linesByKey(
    rows,
    (row) => `${row.invoiceId}|${row.unit}|${row.unitPrice}`,
  ).map((lines) => ({ ...lines[0], ...summedFields(lines) }));
}
