import { UnprocessableEntityException } from '@nestjs/common';
import type { OrderItemInput } from './order-item-input.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';

const idList = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',');

/** Produto, quantidade, adicionais (total de cada), retiradas e observação de uma linha. */
function lineKey(
  productId: number,
  quantity: number,
  addons: string[],
  removedIds: number[],
  note: string | null,
): string {
  const extras = [...addons].sort().join(',');
  return `${productId}|${quantity}|${extras}|${idList(removedIds)}|${note ?? ''}`;
}

const inputKey = (item: OrderItemInput) =>
  lineKey(
    item.productId,
    item.quantity,
    item.addons.map((a) => `${a.productId}x${a.quantity * item.quantity}`),
    item.removedSupplyIds,
    item.note,
  );

const entryKey = (entry: OrderEntry) =>
  lineKey(
    entry.productId,
    entry.quantity,
    entry.addons.map((a) => `${a.productId}x${a.quantity}`),
    entry.removals.map((r) => r.supplyId),
    entry.note,
  );

const pairKey = (productId: number, choiceId: number) =>
  `${productId}:${choiceId}`;

/** O que já estava gravado: linhas sem escolha (de antes de 2026-11-08) e pares item + escolha. */
interface SavedChoices {
  unchosen: Set<string>;
  pairs: Set<string>;
}

function savedChoicesOf(previous: OrderEntry[]): SavedChoices {
  const unchosen = previous.filter((e) => e.choice === null).map(entryKey);
  const pairs = previous.flatMap((e) =>
    e.choice ? [pairKey(e.productId, e.choice.productId)] : [],
  );
  return { unchosen: new Set(unchosen), pairs: new Set(pairs) };
}

function assertChosen(
  item: OrderItemInput,
  parent: SaleProduct,
  saved: SavedChoices,
): void {
  if (parent.choiceCategoryId === null || saved.unchosen.has(inputKey(item)))
    return;
  throw new UnprocessableEntityException(
    `"${parent.name}" precisa de 1 item da categoria "${parent.choiceCategoryName}" (escolha obrigatória); recebido choiceProductId null`,
  );
}

function assertChoiceFits(
  parent: SaleProduct,
  choice: SaleProduct | undefined,
): void {
  if (parent.choiceCategoryId === null)
    throw new UnprocessableEntityException(
      `"${parent.name}" não tem escolha obrigatória; recebido choiceProductId ${choice?.id}, esperado null`,
    );
  if (!choice || choice.categoryId === parent.choiceCategoryId) return;
  throw new UnprocessableEntityException(
    `"${choice.name}" não é opção de "${parent.name}"; esperado 1 item da categoria "${parent.choiceCategoryName}"`,
  );
}

/**
 * Confere a escolha obrigatória de cada linha pela categoria do item (2026-11-08: o pão do
 * artesanal). Na edição, a linha gravada antes da regra (sem pão) passa enquanto não mudar, e o
 * par item + escolha já gravado passa mesmo se a configuração mudou (decisões do usuário).
 * Produto que não existe ou sem preço fica para o preço (`sellable`), que já recusa.
 *
 * @example assertRequiredChoices(input.items, productsById, previousEntries)
 */
export function assertRequiredChoices(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderEntry[],
): void {
  const saved = savedChoicesOf(previous);
  for (const item of items) {
    const parent = products.get(item.productId);
    if (!parent) continue;
    const choiceId = item.choiceProductId;
    if (choiceId === null) assertChosen(item, parent, saved);
    else if (!saved.pairs.has(pairKey(item.productId, choiceId)))
      assertChoiceFits(parent, products.get(choiceId));
  }
}
